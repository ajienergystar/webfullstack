using LatihanASP.Domain.Entities;

namespace LatihanASP.Domain.Interfaces;

public interface IUserRepository
{
    Task<bool> EmailExistsAsync(string email);
    Task<long> CreateAsync(User user);
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(long id);
    Task UpdateLastLoginAsync(long userId);
    Task UpdatePasswordHashAsync(long userId, string passwordHash);
}
