namespace LatihanASP.Application.Settings;

public class AppSettings
{
    public const string SectionName = "App";

    public string FrontendBaseUrl { get; set; } = "http://localhost:3000";
    public string BackupStoragePath { get; set; } = "";
}
