FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY src/ScrapFlow.Domain/*.csproj src/ScrapFlow.Domain/
COPY src/ScrapFlow.Application/*.csproj src/ScrapFlow.Application/
COPY src/ScrapFlow.Infrastructure/*.csproj src/ScrapFlow.Infrastructure/
COPY src/ScrapFlow.API/*.csproj src/ScrapFlow.API/

RUN dotnet restore src/ScrapFlow.API/ScrapFlow.API.csproj

COPY src/ src/
RUN dotnet publish src/ScrapFlow.API/ScrapFlow.API.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser && \
    mkdir -p /app/wwwroot/photos && \
    chown -R appuser:appgroup /app

USER appuser
EXPOSE 8080
ENTRYPOINT ["dotnet", "ScrapFlow.API.dll"]
