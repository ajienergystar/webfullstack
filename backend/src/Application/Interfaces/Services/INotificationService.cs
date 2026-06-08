using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface INotificationService
{
    Task<ServiceResult<NotificationListResponseDto>> GetAllAsync();
}
