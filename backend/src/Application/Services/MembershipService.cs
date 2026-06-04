using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class MembershipService : IMembershipService
{
    private static readonly HashSet<string> AllowedLevels =
        ["Bronze", "Silver", "Gold", "Platinum"];

    private readonly IMembershipRepository _membershipRepository;

    public MembershipService(IMembershipRepository membershipRepository)
    {
        _membershipRepository = membershipRepository;
    }

    public async Task<ServiceResult<MembershipListResponseDto>> GetListAsync(
        string? search, string? level, bool? activeOnly)
    {
        try
        {
            return ServiceResult<MembershipListResponseDto>.Success(
                await _membershipRepository.GetListAsync(search, level, activeOnly));
        }
        catch (Exception)
        {
            return ServiceResult<MembershipListResponseDto>.Failure("Gagal memuat daftar membership.");
        }
    }

    public async Task<ServiceResult<MembershipListItemDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<MembershipListItemDto>.Failure("ID membership tidak valid.");
        try
        {
            var data = await _membershipRepository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<MembershipListItemDto>.Failure("Membership tidak ditemukan.")
                : ServiceResult<MembershipListItemDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<MembershipListItemDto>.Failure("Gagal memuat detail membership.");
        }
    }

    public async Task<ServiceResult<List<MembershipCustomerOptionDto>>> GetAvailableCustomersAsync()
    {
        try
        {
            return ServiceResult<List<MembershipCustomerOptionDto>>.Success(
                await _membershipRepository.GetAvailableCustomersAsync());
        }
        catch (Exception)
        {
            return ServiceResult<List<MembershipCustomerOptionDto>>.Failure(
                "Gagal memuat daftar pelanggan.");
        }
    }

    public async Task<ServiceResult<MembershipMutationResponseDto>> CreateAsync(
        CreateMembershipRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<MembershipMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<MembershipMutationResponseDto>.Success(
                await _membershipRepository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<MembershipMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<MembershipMutationResponseDto>.Failure("Gagal menyimpan membership.");
        }
    }

    public async Task<ServiceResult<MembershipMutationResponseDto>> UpdateAsync(
        int id, UpdateMembershipRequestDto request)
    {
        if (id <= 0) return ServiceResult<MembershipMutationResponseDto>.Failure("ID membership tidak valid.");
        var err = Validate(request);
        if (err is not null) return ServiceResult<MembershipMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<MembershipMutationResponseDto>.Success(
                await _membershipRepository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<MembershipMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<MembershipMutationResponseDto>.Failure("Gagal memperbarui membership.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID membership tidak valid.");
        try
        {
            await _membershipRepository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus membership.");
        }
    }

    private static string? Validate(CreateMembershipRequestDto request)
    {
        if (request.CustomerId <= 0)
            return "Pelanggan wajib dipilih.";
        if (string.IsNullOrWhiteSpace(request.MemberCode))
            return "Kode member wajib diisi.";
        if (request.MemberCode.Trim().Length > 50)
            return "Kode member maksimal 50 karakter.";
        if (string.IsNullOrWhiteSpace(request.MemberLevel))
            return "Level membership wajib dipilih.";
        if (!AllowedLevels.Contains(request.MemberLevel.Trim()))
            return "Level membership tidak valid.";
        if (request.JoinDate == default)
            return "Tanggal bergabung wajib diisi.";
        if (request.ExpiredDate.HasValue && request.ExpiredDate.Value < request.JoinDate)
            return "Tanggal kedaluwarsa tidak boleh sebelum tanggal bergabung.";
        if (request.Notes?.Length > 255)
            return "Catatan maksimal 255 karakter.";
        return null;
    }
}
