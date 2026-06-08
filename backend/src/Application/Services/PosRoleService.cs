using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class PosRoleService : IPosRoleService
{
    private readonly IPosRoleRepository _repository;

    public PosRoleService(IPosRoleRepository repository)
    {
        _repository = repository;
    }

    public async Task<ServiceResult<PosRoleFormDataDto>> GetFormDataAsync()
    {
        try
        {
            var data = await _repository.GetFormDataAsync();
            return ServiceResult<PosRoleFormDataDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<PosRoleFormDataDto>.Failure(
                "Gagal memuat data form role. Pastikan database POS sudah diinisialisasi.");
        }
    }

    public async Task<ServiceResult<PosRoleListResponseDto>> GetAllAsync()
    {
        try
        {
            var data = await _repository.GetAllAsync();
            return ServiceResult<PosRoleListResponseDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<PosRoleListResponseDto>.Failure("Gagal memuat daftar role.");
        }
    }

    public async Task<ServiceResult<PosRoleDetailDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<PosRoleDetailDto>.Failure("ID role tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<PosRoleDetailDto>.Failure("Role tidak ditemukan.")
                : ServiceResult<PosRoleDetailDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<PosRoleDetailDto>.Failure("Gagal memuat detail role.");
        }
    }

    public async Task<ServiceResult<CreatePosRoleResponseDto>> CreateAsync(CreatePosRoleRequestDto request)
    {
        var err = await ValidateAsync(request.RoleName, request.PermissionIds);
        if (err is not null) return ServiceResult<CreatePosRoleResponseDto>.Failure(err);

        if (await _repository.RoleNameExistsAsync(request.RoleName.Trim()))
            return ServiceResult<CreatePosRoleResponseDto>.Failure("Nama role sudah digunakan.");

        try
        {
            var id = await _repository.CreateAsync(request);
            return ServiceResult<CreatePosRoleResponseDto>.Success(new CreatePosRoleResponseDto
            {
                Id = id,
                RoleName = request.RoleName.Trim()
            });
        }
        catch (Exception)
        {
            return ServiceResult<CreatePosRoleResponseDto>.Failure("Gagal menyimpan role baru.");
        }
    }

    public async Task<ServiceResult<MessageResponseDto>> UpdateAsync(int id, UpdatePosRoleRequestDto request)
    {
        if (id <= 0) return ServiceResult<MessageResponseDto>.Failure("ID role tidak valid.");

        var err = await ValidateAsync(request.RoleName, request.PermissionIds);
        if (err is not null) return ServiceResult<MessageResponseDto>.Failure(err);

        if (await _repository.GetByIdAsync(id) is null)
            return ServiceResult<MessageResponseDto>.Failure("Role tidak ditemukan.");

        if (await _repository.RoleNameExistsAsync(request.RoleName.Trim(), id))
            return ServiceResult<MessageResponseDto>.Failure("Nama role sudah digunakan.");

        try
        {
            await _repository.UpdateAsync(id, request);
            return ServiceResult<MessageResponseDto>.Success(
                new MessageResponseDto("Data role berhasil diperbarui."));
        }
        catch (Exception)
        {
            return ServiceResult<MessageResponseDto>.Failure("Gagal memperbarui role.");
        }
    }

    public async Task<ServiceResult<MessageResponseDto>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<MessageResponseDto>.Failure("ID role tidak valid.");

        if (await _repository.GetByIdAsync(id) is null)
            return ServiceResult<MessageResponseDto>.Failure("Role tidak ditemukan.");

        var userCount = await _repository.GetUserCountByRoleIdAsync(id);
        if (userCount > 0)
        {
            return ServiceResult<MessageResponseDto>.Failure(
                $"Role masih dipakai oleh {userCount} user. Pindahkan user ke role lain terlebih dahulu.");
        }

        try
        {
            await _repository.DeleteAsync(id);
            return ServiceResult<MessageResponseDto>.Success(
                new MessageResponseDto("Role berhasil dihapus."));
        }
        catch (Exception)
        {
            return ServiceResult<MessageResponseDto>.Failure("Gagal menghapus role.");
        }
    }

    private async Task<string?> ValidateAsync(string roleName, List<int> permissionIds)
    {
        if (string.IsNullOrWhiteSpace(roleName))
            return "Nama role wajib diisi.";
        if (roleName.Trim().Length > 50)
            return "Nama role maksimal 50 karakter.";
        if (permissionIds is null || permissionIds.Count == 0)
            return "Pilih minimal satu permission.";
        if (!await _repository.AllPermissionsExistAsync(permissionIds))
            return "Permission tidak valid.";
        return null;
    }
}
