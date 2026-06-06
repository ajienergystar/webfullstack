namespace LatihanASP.Application.Interfaces;

public interface IPosDatabaseBackupEngine
{
    Task ExportToFileAsync(string filePath);
    Task<(bool Success, int TablesRestored, string Message)> RestoreFromFileAsync(string filePath);
    Task<(bool Success, int TablesRestored, string Message)> RestoreFromStreamAsync(Stream stream);
}
