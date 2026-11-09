# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first so the package layer is cached until the project file changes.
COPY src/SchoolAdmission.Api/SchoolAdmission.Api.csproj src/SchoolAdmission.Api/
RUN dotnet restore src/SchoolAdmission.Api/SchoolAdmission.Api.csproj

COPY src/ src/
RUN dotnet publish src/SchoolAdmission.Api/SchoolAdmission.Api.csproj \
    --configuration Release --no-restore --output /app

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

# Built-in non-root user of the .NET images.
USER $APP_UID

ENTRYPOINT ["dotnet", "SchoolAdmission.Api.dll"]
