namespace LatihanASP.Application.DTOs;

public class ExternalIntegrationListResponseDto
{
    public List<ExternalIntegrationListItemDto> Integrations { get; set; } = [];
    public int TotalCount { get; set; }
    public int ActiveCount { get; set; }
    public int SyncedCount { get; set; }
}

public class ExternalIntegrationListItemDto
{
    public int Id { get; set; }
    public string IntegrationName { get; set; } = "";
    public string IntegrationType { get; set; } = "";
    public string Provider { get; set; } = "";
    public string? ApiKeyMasked { get; set; }
    public string? ApiSecretMasked { get; set; }
    public string? WebhookUrl { get; set; }
    public string? BaseUrl { get; set; }
    public string SyncDirection { get; set; } = "Bidirectional";
    public DateTime? LastSyncAt { get; set; }
    public string? LastSyncStatus { get; set; }
    public string? Notes { get; set; }
    public int? OutletId { get; set; }
    public string? OutletName { get; set; }
    public bool IsActive { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class ExternalIntegrationDetailDto : ExternalIntegrationListItemDto
{
    public string? ApiKey { get; set; }
    public string? ApiSecret { get; set; }
}

public class CreateExternalIntegrationRequestDto
{
    public string IntegrationName { get; set; } = "";
    public string IntegrationType { get; set; } = "Accounting";
    public string Provider { get; set; } = "";
    public string? ApiKey { get; set; }
    public string? ApiSecret { get; set; }
    public string? WebhookUrl { get; set; }
    public string? BaseUrl { get; set; }
    public string SyncDirection { get; set; } = "Bidirectional";
    public string? Notes { get; set; }
    public int? OutletId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateExternalIntegrationRequestDto : CreateExternalIntegrationRequestDto
{
}

public class ExternalIntegrationMutationResponseDto
{
    public int Id { get; set; }
    public string IntegrationName { get; set; } = "";
}
