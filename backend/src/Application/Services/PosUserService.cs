using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Domain.Interfaces;
using LatihanASP.Domain.Common;

namespace LatihanASP.Application.Services;

public class PosUserService : IPosUserService
{
    private readonly IPosUserRepository _repository;
    private readonly IPasswordHasher _passwordHasher;

    public PosUserService(IPosUserRepository repository, IPasswordHasher passwordHasher)
    {
        _repository = repository;
        _passwordHasher = passwordHasher;
    }

    public async Task<ServiceResult<PosUserFormDataDto>> GetFormDataAsync()
    {
        try
        {
            var data = await _repository.GetFormDataAsync();
            return ServiceResult<PosUserFormDataDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<PosUserFormDataDto>.Failure(
                "Gagal memuat data form user. Pastikan database POS sudah diinisialisasi.");
        }
    }

    public async Task<ServiceResult<PosUserListResponseDto>> GetAllAsync()
    {
        try
        {
            var data = await _repository.GetAllAsync();
            return ServiceResult<PosUserListResponseDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<PosUserListResponseDto>.Failure("Gagal memuat daftar user.");
        }
    }

    public async Task<ServiceResult<PosUserDetailDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<PosUserDetailDto>.Failure("ID user tidak valid.");
        try
        {
            var data = await _repository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<PosUserDetailDto>.Failure("User tidak ditemukan.")
                : ServiceResult<PosUserDetailDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<PosUserDetailDto>.Failure("Gagal memuat detail user.");
        }
    }

    public async Task<ServiceResult<CreatePosUserResponseDto>> CreateAsync(CreatePosUserRequestDto request)
    {
        var err = await ValidateCreateAsync(request);
        if (err is not null) return ServiceResult<CreatePosUserResponseDto>.Failure(err);

        try
        {
            var hash = _passwordHasher.Hash(request.Password);
            var id = await _repository.CreateAsync(request, hash);
            return ServiceResult<CreatePosUserResponseDto>.Success(new CreatePosUserResponseDto
            {
                Id = id,
                Username = request.Username.Trim()
            });
        }
        catch (Exception ex) when (ex.Message.Contains("UNIQUE") || ex.Message.Contains("duplicate"))
        {
            return ServiceResult<CreatePosUserResponseDto>.Failure("Username sudah digunakan.");
        }
        catch (Exception)
        {
            return ServiceResult<CreatePosUserResponseDto>.Failure("Gagal menyimpan user baru.");
        }
    }

    public async Task<ServiceResult<MessageResponseDto>> UpdateAsync(int id, UpdatePosUserRequestDto request)
    {
        if (id <= 0) return ServiceResult<MessageResponseDto>.Failure("ID user tidak valid.");

        var err = await ValidateUpdateAsync(id, request);
        if (err is not null) return ServiceResult<MessageResponseDto>.Failure(err);

        try
        {
            string? hash = string.IsNullOrWhiteSpace(request.Password)
                ? null
                : _passwordHasher.Hash(request.Password);
            await _repository.UpdateAsync(id, request, hash);
            return ServiceResult<MessageResponseDto>.Success(
                new MessageResponseDto("Data user berhasil diperbarui."));
        }
        catch (Exception ex) when (ex.Message.Contains("UNIQUE") || ex.Message.Contains("duplicate"))
        {
            return ServiceResult<MessageResponseDto>.Failure("Username sudah digunakan.");
        }
        catch (Exception)
        {
            return ServiceResult<MessageResponseDto>.Failure("Gagal memperbarui user.");
        }
    }

    private async Task<string?> ValidateCreateAsync(CreatePosUserRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return "Nama lengkap wajib diisi.";
        if (string.IsNullOrWhiteSpace(request.Username))
            return "Username wajib diisi.";
        if (request.Username.Trim().Length > 50)
            return "Username maksimal 50 karakter.";
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            return "Password minimal 6 karakter.";
        if (request.RoleId <= 0)
            return "Role wajib dipilih.";
        if (!await _repository.RoleExistsAsync(request.RoleId))
            return "Role tidak valid.";
        if (await _repository.UsernameExistsAsync(request.Username.Trim()))
            return "Username sudah digunakan.";
        return null;
    }

    private async Task<string?> ValidateUpdateAsync(int id, UpdatePosUserRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return "Nama lengkap wajib diisi.";
        if (string.IsNullOrWhiteSpace(request.Username))
            return "Username wajib diisi.";
        if (request.Username.Trim().Length > 50)
            return "Username maksimal 50 karakter.";
        if (!string.IsNullOrWhiteSpace(request.Password) && request.Password.Length < 6)
            return "Password minimal 6 karakter.";
        if (request.RoleId <= 0)
            return "Role wajib dipilih.";
        if (!await _repository.RoleExistsAsync(request.RoleId))
            return "Role tidak valid.";
        if (await _repository.GetByIdAsync(id) is null)
            return "User tidak ditemukan.";
        if (await _repository.UsernameExistsAsync(request.Username.Trim(), id))
            return "Username sudah digunakan.";
        return null;
    }
}
