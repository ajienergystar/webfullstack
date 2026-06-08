using LatihanASP.Application.DTOs;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Interfaces;

public interface IPosRoleService
{
    Task<ServiceResult<PosRoleFormDataDto>> GetFormDataAsync();
    Task<ServiceResult<PosRoleListResponseDto>> GetAllAsync();
    Task<ServiceResult<PosRoleDetailDto>> GetByIdAsync(int id);
    Task<ServiceResult<CreatePosRoleResponseDto>> CreateAsync(CreatePosRoleRequestDto request);
    Task<ServiceResult<MessageResponseDto>> UpdateAsync(int id, UpdatePosRoleRequestDto request);
    Task<ServiceResult<MessageResponseDto>> DeleteAsync(int id);
}
