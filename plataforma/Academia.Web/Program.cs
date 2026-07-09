using Academia.Dominio;
using Academia.IA;
using Academia.Web.Components;
using Academia.Web.Servicios;
using Anthropic;
using Cosmos.EventSourcing.CritterStack;
using Cosmos.EventSourcing.CritterStack.Commands;
using Cosmos.MultiTenancy;
using System.Net.Http.Headers;

var builder = WebApplication.CreateBuilder(args);

// ── El dominio, sobre Cosmos.BuildingBlocks (dogfood) ─────────────────────────
var connectionString = builder.Configuration.GetConnectionString("academia")
    ?? "Host=localhost;Port=5433;Database=academia;Username=academia;Password=dev_local_pwd";

builder.Host.UsarWolverineParaComandos(
    typeof(Inscripcion).Assembly,
    connectionString,
    databaseSchemaName: "academia",
    isDevelopment: builder.Environment.IsDevelopment());

builder.Services.AgregarMartenEventStore();          // IEventStore → MartenEventStore (Scoped)
builder.Services.AgregarWolverineCommandRouter();    // ICommandRouter → Wolverine (con tenancy)
builder.Services.AddScoped<ITenantResolver, TenantFijo>();   // v1: un solo tenant

// ── Contenido, GitHub e IA ────────────────────────────────────────────────────
builder.Services.AddSingleton<CatalogoDeTalleres>();
builder.Services.AddHttpClient<GitHubCliente>(http =>
{
    http.BaseAddress = new Uri("https://api.github.com/");
    http.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("AcademiaCosmos", "1.0"));
    http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
    var token = Environment.GetEnvironmentVariable("GITHUB_TOKEN");
    if (!string.IsNullOrEmpty(token))
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
});
builder.Services.AddSingleton(new AnthropicClient());   // lee ANTHROPIC_API_KEY del entorno
builder.Services.AddSingleton<EvaluadorDeReflexiones>();
builder.Services.AddSingleton<AsistenteDeSeccion>();
builder.Services.AddScoped<SincronizadorDeAvance>();

// ── Blazor ────────────────────────────────────────────────────────────────────
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}
app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);

app.UseAntiforgery();
app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();

/// <summary>v1: la plataforma corre para un solo tenant; el multi-tenant llega con la academia multi-equipo.</summary>
public class TenantFijo : ITenantResolver
{
    public string TenantId => "academia";
    public string UserId => "plataforma";
}
