using LatihanASP.Domain.Entities;

namespace LatihanASP.Domain.Interfaces;

public interface IUserSessionRepository
{
    Task CreateAsync(UserSession session);
    Task<User?> GetUserByAccessTokenAsync(string accessToken);
    Task<bool> DeleteByAccessTokenAsync(string accessToken);
}
