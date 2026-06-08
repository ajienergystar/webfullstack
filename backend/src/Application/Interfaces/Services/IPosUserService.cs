using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IPosUserService
{
    Task<ServiceResult<PosUserFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<PosUserListResponseDto>> GetAllAsync();
    Task<ServiceResult<PosUserDetailDto>> GetByIdAsync(int id);
    Task<ServiceResult<CreatePosUserResponseDto>> CreateAsync(CreatePosUserRequestDto request);
    Task<ServiceResult<MessageResponseDto>> UpdateAsync(int id, UpdatePosUserRequestDto request);
}
