using LatihanASP.Application.DTOs;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Interfaces;

public interface INotificationService
{
    Task<ServiceResult<NotificationListResponseDto>> GetAllAsync();
}
