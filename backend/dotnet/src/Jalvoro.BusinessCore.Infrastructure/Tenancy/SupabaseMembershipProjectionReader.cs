using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Jalvoro.BusinessCore.Application.Tenancy;
using Jalvoro.BusinessCore.Domain.Security;
using Jalvoro.BusinessCore.Domain.Tenancy;
using Jalvoro.BusinessCore.Infrastructure.Security;

namespace Jalvoro.BusinessCore.Infrastructure.Tenancy;

public sealed class SupabaseMembershipProjectionReader : IBusinessMembershipProjectionReader
{
  private readonly HttpClient _httpClient;
  private readonly SupabaseIdentityConfigurationState _configurationState;

  public SupabaseMembershipProjectionReader(
    HttpClient httpClient,
    SupabaseIdentityConfigurationState configurationState)
  {
    ArgumentNullException.ThrowIfNull(httpClient);
    ArgumentNullException.ThrowIfNull(configurationState);

    _httpClient = httpClient;
    _configurationState = configurationState;
  }

  public async ValueTask<BusinessMembershipLookupResult> ReadActiveAsync(
    BusinessTenantId tenantId,
    BusinessSubjectId subjectId,
    string bearerToken,
    CancellationToken cancellationToken)
  {
    ArgumentNullException.ThrowIfNull(tenantId);
    ArgumentNullException.ThrowIfNull(subjectId);
    ArgumentException.ThrowIfNullOrWhiteSpace(bearerToken);

    var configuration = _configurationState.Current;
    if (configuration is null)
    {
      return BusinessMembershipLookupResult.TemporarilyUnavailable();
    }

    var query = string.Join(
      '&',
      "select=business_id,user_id,role,status,permissions",
      $"business_id=eq.{Uri.EscapeDataString(tenantId.ToString())}",
      $"user_id=eq.{Uri.EscapeDataString(subjectId.ToString())}",
      "status=eq.active",
      "limit=1");
    var endpoint = new Uri(configuration.DataApiEndpoint, $"business_members?{query}");

    using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);
    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
    request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    request.Headers.TryAddWithoutValidation("apikey", configuration.PublishableKey);
    request.Headers.TryAddWithoutValidation("Accept-Profile", "public");

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
      return BusinessMembershipLookupResult.TemporarilyUnavailable();
    }
    catch (HttpRequestException)
    {
      return BusinessMembershipLookupResult.TemporarilyUnavailable();
    }

    using (response)
    {
      if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
      {
        return BusinessMembershipLookupResult.NotFound();
      }

      if (!response.IsSuccessStatusCode)
      {
        return BusinessMembershipLookupResult.TemporarilyUnavailable();
      }

      try
      {
        await using var body = await response.Content.ReadAsStreamAsync(timeout.Token);
        using var document = await JsonDocument.ParseAsync(
          body,
          new JsonDocumentOptions { MaxDepth = 16 },
          timeout.Token);

        if (document.RootElement.ValueKind is not JsonValueKind.Array)
        {
          return BusinessMembershipLookupResult.TemporarilyUnavailable();
        }

        var rows = document.RootElement;
        if (rows.GetArrayLength() == 0)
        {
          return BusinessMembershipLookupResult.NotFound();
        }

        if (rows.GetArrayLength() != 1)
        {
          return BusinessMembershipLookupResult.TemporarilyUnavailable();
        }

        return ParseMembership(rows[0], tenantId, subjectId);
      }
      catch (JsonException)
      {
        return BusinessMembershipLookupResult.TemporarilyUnavailable();
      }
      catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
      {
        return BusinessMembershipLookupResult.TemporarilyUnavailable();
      }
    }
  }

  private static BusinessMembershipLookupResult ParseMembership(
    JsonElement row,
    BusinessTenantId expectedTenantId,
    BusinessSubjectId expectedSubjectId)
  {
    if (
      !TryReadString(row, "business_id", out var businessId) ||
      !BusinessTenantId.TryParse(businessId, out var tenantId) ||
      tenantId != expectedTenantId ||
      !TryReadString(row, "user_id", out var userId) ||
      !BusinessSubjectId.TryParse(userId, out var subjectId) ||
      subjectId != expectedSubjectId ||
      !TryReadString(row, "status", out var status) ||
      !string.Equals(status, "active", StringComparison.Ordinal) ||
      !TryReadString(row, "role", out var roleValue) ||
      !BusinessMembershipRole.TryParse(roleValue, out var role) ||
      !TryReadPermissions(row, out var permissions))
    {
      return BusinessMembershipLookupResult.TemporarilyUnavailable();
    }

    return BusinessMembershipLookupResult.Found(
      new BusinessMembershipProjection(tenantId, subjectId, role, permissions));
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

  private static bool TryReadPermissions(
    JsonElement source,
    out IReadOnlyList<string> permissions)
  {
    if (
      !source.TryGetProperty("permissions", out var property) ||
      property.ValueKind is not JsonValueKind.Array)
    {
      permissions = [];
      return false;
    }

    var values = new List<string>();
    foreach (var permission in property.EnumerateArray())
    {
      if (permission.ValueKind is not JsonValueKind.String)
      {
        permissions = [];
        return false;
      }

      var value = permission.GetString();
      if (string.IsNullOrWhiteSpace(value) || value.Length > 128)
      {
        permissions = [];
        return false;
      }

      values.Add(value);
    }

    permissions = values;
    return true;
  }
}
