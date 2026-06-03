using Microsoft.AspNetCore.Mvc;

namespace LatihanASP.API.Controllers;

[ApiController]
[Route("api")]
public class HelloController : ControllerBase
{
    [HttpGet("hello")]
    public IActionResult Get() => Ok(new { message = "Hello World" });
}
