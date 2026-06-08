using LatihanASP.Application.DTOs;

namespace LatihanASP.Application.Interfaces;

public interface INotificationRepository
{
    Task<NotificationListResponseDto> GetAllAsync();
}
