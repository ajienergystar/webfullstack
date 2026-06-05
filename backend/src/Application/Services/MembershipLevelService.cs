using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class MembershipLevelService : IMembershipLevelService
{
    private readonly IMembershipLevelRepository _membershipLevelRepository;

    public MembershipLevelService(IMembershipLevelRepository membershipLevelRepository)
    {
        _membershipLevelRepository = membershipLevelRepository;
    }

    public async Task<ServiceResult<MembershipLevelListResponseDto>> GetListAsync(
        string? search, bool? isActive)
    {
        try
        {
            return ServiceResult<MembershipLevelListResponseDto>.Success(
                await _membershipLevelRepository.GetListAsync(search, isActive));
        }
        catch (Exception)
        {
            return ServiceResult<MembershipLevelListResponseDto>.Failure(
                "Gagal memuat daftar level membership.");
        }
    }

    public async Task<ServiceResult<MembershipLevelListItemDto>> GetByIdAsync(int id)
    {
        if (id <= 0)
            return ServiceResult<MembershipLevelListItemDto>.Failure("ID level membership tidak valid.");
        try
        {
            var data = await _membershipLevelRepository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<MembershipLevelListItemDto>.Failure("Level membership tidak ditemukan.")
                : ServiceResult<MembershipLevelListItemDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<MembershipLevelListItemDto>.Failure(
                "Gagal memuat detail level membership.");
        }
    }

    public async Task<ServiceResult<MembershipLevelMutationResponseDto>> CreateAsync(
        CreateMembershipLevelRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<MembershipLevelMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<MembershipLevelMutationResponseDto>.Success(
                await _membershipLevelRepository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<MembershipLevelMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<MembershipLevelMutationResponseDto>.Failure(
                "Gagal menyimpan level membership.");
        }
    }

    public async Task<ServiceResult<MembershipLevelMutationResponseDto>> UpdateAsync(
        int id, UpdateMembershipLevelRequestDto request)
    {
        if (id <= 0)
            return ServiceResult<MembershipLevelMutationResponseDto>.Failure("ID level membership tidak valid.");
        var err = Validate(request);
        if (err is not null) return ServiceResult<MembershipLevelMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<MembershipLevelMutationResponseDto>.Success(
                await _membershipLevelRepository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<MembershipLevelMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<MembershipLevelMutationResponseDto>.Failure(
                "Gagal memperbarui level membership.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID level membership tidak valid.");
        try
        {
            await _membershipLevelRepository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus level membership.");
        }
    }

    private static string? Validate(CreateMembershipLevelRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.LevelName))
            return "Nama level wajib diisi.";
        if (request.LevelName.Trim().Length > 50)
            return "Nama level maksimal 50 karakter.";
        if (request.MinLoyaltyPoint < 0)
            return "Minimum loyalty point tidak boleh negatif.";
        if (request.DiscountPercent < 0 || request.DiscountPercent > 100)
            return "Persentase diskon harus antara 0 dan 100.";
        if (request.SortOrder < 0)
            return "Urutan tampilan tidak boleh negatif.";
        if (request.Description?.Length > 255)
            return "Deskripsi maksimal 255 karakter.";
        return null;
    }
}
