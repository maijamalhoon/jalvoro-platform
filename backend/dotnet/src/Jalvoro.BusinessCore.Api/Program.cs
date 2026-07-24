using Jalvoro.BusinessCore.Api;

var builder = WebApplication.CreateBuilder(args);
builder.AddJalvoroBusinessCoreApi();

var app = builder.Build();
app.UseJalvoroBusinessCoreApi();
app.Run();

public partial class Program;
