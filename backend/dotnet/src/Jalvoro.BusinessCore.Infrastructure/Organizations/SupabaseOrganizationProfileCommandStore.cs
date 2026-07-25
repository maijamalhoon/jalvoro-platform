using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Jalvoro.BusinessCore.Application.Organizations;
using Jalvoro.BusinessCore.Domain.Tenancy;
using Jalvoro.BusinessCore.Infrastructure.Security;
using Microsoft.AspNetCore.Http;

namespace Jalvoro.BusinessCore.Infrastructure.Organizations;

public sealed class SupabaseOrganizationProfileCommandStore : IOrganizationProfileCommandStore
{
  private readonly HttpClient _httpClient;
  private readonly IHttpContextAccessor _httpContextAccessor;
  private readonly SupabaseIdentityConfigurationState _configurationState;

  public SupabaseOrganizationProfileCommandStore(
    HttpClient httpClient,
    IHttpContextAccessor httpContextAccessor,
    SupabaseIdentityConfigurationState configurationState)
  {
    ArgumentNullException.ThrowIfNull(httpClient);
    ArgumentNullException.ThrowIfNull(httpContextAccessor);
    ArgumentNullException.ThrowIfNull(configurationState);

    _httpClient = httpClient;
    _httpContextAccessor = httpContextAccessor;
    _configurationState = configurationState;
  }

  public async ValueTask<OrganizationProfileWriteResult> UpdateAsync(
    UpdateOrganizationProfileCommand command,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(command);

    var configuration = _configurationState.Current;
    var bearerToken = ReadBearerToken();
    if (configuration is null || bearerToken is null)
    {
      return OrganizationProfileWriteResult.TemporarilyUnavailable();
    }

    var endpoint = new Uri(configuration.DataApiEndpoint, "rpc/update_business_profile_v1");
    using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
    {
      Content = JsonContent.Create(new
      {
        p_business_id = command.TenantId.ToString(),
        p_expected_version = command.ExpectedVersion,
        p_idempotency_key = command.IdempotencyKey.Value,
        p_name = command.Profile.Name,
        p_description = command.Profile.Description,
        p_timezone = command.Profile.Timezone,
        p_fiscal_year_start_month = command.Profile.FiscalYearStartMonth,
      }),
    };
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
    request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    request.Headers.TryAddWithoutValidation("apikey", configuration.PublishableKey);
    request.Headers.TryAddWithoutValidation("Accept-Profile", "public");
    request.Headers.TryAddWithoutValidation("Content-Profile", "public");

    using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
    timeout.CancelAfter(configuration.RemoteCallTimeout);

    HttpResponseMessage response;
    try
    {
      response = await _httpClient.SendAsync(
        request,
        HttpCompletionOption.ResponseHeadersRead,
        timeout.Token);
    }
    catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
    {
      return OrganizationProfileWriteResult.TemporarilyUnavailable();
    }
    catch (HttpRequestException)
    {
      return OrganizationProfileWriteResult.TemporarilyUnavailable();
    }

    using (response)
    {
      if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
      {
        return OrganizationProfileWriteResult.Forbidden();
      }

      if (!response.IsSuccessStatusCode)
      {
        return OrganizationProfileWriteResult.TemporarilyUnavailable();
      }

      try
      {
        await using var body = await response.Content.ReadAsStreamAsync(timeout.Token);
        using var document = await JsonDocument.ParseAsync(
          body,
          new JsonDocumentOptions { MaxDepth = 16 },
          timeout.Token);
        return ParseResult(document.RootElement, command);
      }
      catch (JsonException)
      {
        return OrganizationProfileWriteResult.TemporarilyUnavailable();
      }
      catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
      {
        return OrganizationProfileWriteResult.TemporarilyUnavailable();
      }
    }
  }

  private string? ReadBearerToken()
  {
    var authorization = _httpContextAccessor.HttpContext?
      .Request
      .Headers
      .Authorization
      .FirstOrDefault();
    if (string.IsNullOrWhiteSpace(authorization) ||
        !authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
      return null;
    }

    var token = authorization["Bearer ".Length..].Trim();
    return token.Split('.').Length == 3 ? token : null;
  }

  private static OrganizationProfileWriteResult ParseResult(
    JsonElement root,
    UpdateOrganizationProfileCommand command)
  {
    if (
      root.ValueKind is not JsonValueKind.Object ||
      !TryReadString(root, "code", out var code))
    {
      return OrganizationProfileWriteResult.TemporarilyUnavailable();
    }

    return code switch
    {
      "updated" => ParseSnapshot(root, command, replayed: false),
      "replayed" => ParseSnapshot(root, command, replayed: true),
      "idempotency_conflict" => OrganizationProfileWriteResult.IdempotencyConflict(),
      "version_conflict" => TryReadInt64(root, "currentVersion", out var currentVersion) &&
        currentVersion > 0
          ? OrganizationProfileWriteResult.VersionConflict(currentVersion)
          : OrganizationProfileWriteResult.TemporarilyUnavailable(),
      "validation_failed" => OrganizationProfileWriteResult.ValidationFailed(),
      "forbidden" => OrganizationProfileWriteResult.Forbidden(),
      "not_found" => OrganizationProfileWriteResult.NotFound(),
      _ => OrganizationProfileWriteResult.TemporarilyUnavailable(),
    };
  }

  private static OrganizationProfileWriteResult ParseSnapshot(
    JsonElement root,
    UpdateOrganizationProfileCommand command,
    bool replayed)
  {
    if (
      !TryReadString(root, "tenantId", out var tenantValue) ||
      !BusinessTenantId.TryParse(tenantValue, out var tenantId) ||
      tenantId != command.TenantId ||
      !TryReadInt64(root, "profileVersion", out var version) ||
      version < 1 ||
      !TryReadString(root, "name", out var name) ||
      !TryReadNullableString(root, "description", out var description) ||
      !TryReadString(root, "timezone", out var timezone) ||
      !TryReadInt16(root, "fiscalYearStartMonth", out var fiscalYearStartMonth) ||
      !string.Equals(name, command.Profile.Name, StringComparison.Ordinal) ||
      !string.Equals(description, command.Profile.Description, StringComparison.Ordinal) ||
      !string.Equals(timezone, command.Profile.Timezone, StringComparison.Ordinal) ||
      fiscalYearStartMonth != command.Profile.FiscalYearStartMonth)
    {
      return OrganizationProfileWriteResult.TemporarilyUnavailable();
    }

    var snapshot = new OrganizationProfileSnapshot(
      tenantId,
      version,
      name,
      description,
      timezone,
      fiscalYearStartMonth);
    return replayed
      ? OrganizationProfileWriteResult.Replayed(snapshot)
      : OrganizationProfileWriteResult.Updated(snapshot);
  }

  private static bool TryReadString(
    JsonElement source,
    string propertyName,
    out string? value)
  {
    if (
      source.ValueKind is not JsonValueKind.Object ||
      !source.TryGetProperty(propertyName, out var property) ||
      property.ValueKind is not JsonValueKind.String)
    {
      value = null;
      return false;
    }

    value = property.GetString();
    return !string.IsNullOrWhiteSpace(value);
  }

  private static bool TryReadNullableString(
    JsonElement source,
    string propertyName,
    out string? value)
  {
    value = null;
    if (!source.TryGetProperty(propertyName, out var property))
    {
      return false;
    }

    if (property.ValueKind is JsonValueKind.Null)
    {
      return true;
    }

    if (property.ValueKind is not JsonValueKind.String)
    {
      return false;
    }

    value = property.GetString();
    return value is not null;
  }

  private static bool TryReadInt64(
    JsonElement source,
    string propertyName,
    out long value)
  {
    value = 0;
    return source.TryGetProperty(propertyName, out var property) &&
      property.TryGetInt64(out value);
  }

  private static bool TryReadInt16(
    JsonElement source,
    string propertyName,
    out short value)
  {
    value = 0;
    return source.TryGetProperty(propertyName, out var property) &&
      property.TryGetInt16(out value);
  }
}
