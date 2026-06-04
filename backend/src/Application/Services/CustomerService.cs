using LatihanASP.Application.DTOs;
using LatihanASP.Application.Interfaces;
using LatihanASP.Shared.Common;

namespace LatihanASP.Application.Services;

public class CustomerService : ICustomerService
{
    private readonly ICustomerRepository _customerRepository;

    public CustomerService(ICustomerRepository customerRepository)
    {
        _customerRepository = customerRepository;
    }

    public async Task<ServiceResult<CustomerListResponseDto>> GetListAsync(string? search)
    {
        try
        {
            return ServiceResult<CustomerListResponseDto>.Success(
                await _customerRepository.GetListAsync(search));
        }
        catch (Exception)
        {
            return ServiceResult<CustomerListResponseDto>.Failure("Gagal memuat daftar pelanggan.");
        }
    }

    public async Task<ServiceResult<CustomerListItemDto>> GetByIdAsync(int id)
    {
        if (id <= 0) return ServiceResult<CustomerListItemDto>.Failure("ID pelanggan tidak valid.");
        try
        {
            var data = await _customerRepository.GetByIdAsync(id);
            return data is null
                ? ServiceResult<CustomerListItemDto>.Failure("Pelanggan tidak ditemukan.")
                : ServiceResult<CustomerListItemDto>.Success(data);
        }
        catch (Exception)
        {
            return ServiceResult<CustomerListItemDto>.Failure("Gagal memuat detail pelanggan.");
        }
    }

    public async Task<ServiceResult<CustomerMutationResponseDto>> CreateAsync(CreateCustomerRequestDto request)
    {
        var err = Validate(request);
        if (err is not null) return ServiceResult<CustomerMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<CustomerMutationResponseDto>.Success(
                await _customerRepository.CreateAsync(request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<CustomerMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<CustomerMutationResponseDto>.Failure("Gagal menyimpan pelanggan.");
        }
    }

    public async Task<ServiceResult<CustomerMutationResponseDto>> UpdateAsync(
        int id, UpdateCustomerRequestDto request)
    {
        if (id <= 0) return ServiceResult<CustomerMutationResponseDto>.Failure("ID pelanggan tidak valid.");
        var err = Validate(request);
        if (err is not null) return ServiceResult<CustomerMutationResponseDto>.Failure(err);
        try
        {
            return ServiceResult<CustomerMutationResponseDto>.Success(
                await _customerRepository.UpdateAsync(id, request));
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<CustomerMutationResponseDto>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<CustomerMutationResponseDto>.Failure("Gagal memperbarui pelanggan.");
        }
    }

    public async Task<ServiceResult<bool>> DeleteAsync(int id)
    {
        if (id <= 0) return ServiceResult<bool>.Failure("ID pelanggan tidak valid.");
        try
        {
            await _customerRepository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true);
        }
        catch (InvalidOperationException ex)
        {
            return ServiceResult<bool>.Failure(ex.Message);
        }
        catch (Exception)
        {
            return ServiceResult<bool>.Failure("Gagal menghapus pelanggan.");
        }
    }

    private static string? Validate(CreateCustomerRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.CustomerName))
            return "Nama pelanggan wajib diisi.";
        if (request.CustomerName.Trim().Length > 100)
            return "Nama pelanggan maksimal 100 karakter.";
        if (request.PhoneNumber?.Length > 20)
            return "Nomor telepon maksimal 20 karakter.";
        if (request.Address?.Length > 255)
            return "Alamat maksimal 255 karakter.";
        if (request.LoyaltyPoint < 0)
            return "Loyalty point tidak boleh negatif.";
        return null;
    }
}
