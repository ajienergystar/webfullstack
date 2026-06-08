FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/Domain/LatihanASP.Domain.csproj src/Domain/
COPY src/Application/LatihanASP.Application.csproj src/Application/
COPY src/Infrastructure/LatihanASP.Infrastructure.csproj src/Infrastructure/
COPY src/Presentation/LatihanASP.Presentation.csproj src/Presentation/
RUN dotnet restore src/Presentation/LatihanASP.Presentation.csproj
COPY src/ src/
RUN dotnet publish src/Presentation/LatihanASP.Presentation.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "LatihanASP.Presentation.dll"]
