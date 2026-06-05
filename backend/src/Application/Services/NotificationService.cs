using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;

    public NotificationService(INotificationRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<NotificationListResponseDto>> GetAllAsync()
    {
        try
        {
            var data = await _repository.GetAllAsync();
            return ServiceResult<NotificationListResponseDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<NotificationListResponseDto>.Failure(
                "Gagal memuat notifikasi. Pastikan database POS sudah diinisialisasi.");
        }
    }
}
