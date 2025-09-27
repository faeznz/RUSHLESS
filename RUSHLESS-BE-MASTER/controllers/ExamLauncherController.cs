using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace YourExistingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExamLauncherController : ControllerBase
    {
        private readonly ILogger<ExamLauncherController> _logger;
        private static readonly Dictionary<string, ProcessInfo> _activeSessions = new();

        public ExamLauncherController(ILogger<ExamLauncherController> logger)
        {
            _logger = logger;
        }

        public class LaunchExamRequest
        {
            public string ExamUrl { get; set; } = "";
            public string? SessionId { get; set; }
            public string? StudentId { get; set; }
        }

        public class ProcessInfo
        {
            public string StudentId { get; set; } = "";
            public string ExamUrl { get; set; } = "";
            public int ProcessId { get; set; }
            public DateTime StartTime { get; set; }
        }

        [HttpGet("health")]
        public IActionResult GetHealth()
        {
            return Ok(new { status = "OK", message = "Exam Launcher API is running" });
        }

        [HttpPost("launch")]
        public async Task<IActionResult> LaunchExam([FromBody] LaunchExamRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.ExamUrl))
                {
                    return BadRequest(new { success = false, error = "ExamUrl is required" });
                }

                // Get the path to the exam browser executable
                var currentDir = Directory.GetCurrentDirectory();
                var examBrowserPath = Path.Combine(currentDir, "ExamBrowser", "ExamBrowser.exe");
                
                // Alternative paths to check
                var alternativePaths = new[]
                {
                    Path.Combine(currentDir, "ExamBrowser", "ExamBrowser.exe"),
                    Path.Combine(currentDir, "bin", "ExamBrowser.exe"),
                    @"D:\app\bin\Release\net6.0-windows\ExamBrowser.exe",
                    @"D:\Hasil Coding\ExamApp\backend\ExamBrowser\ExamBrowser.exe"
                };

                // Find the executable
                if (!System.IO.File.Exists(examBrowserPath))
                {
                    examBrowserPath = alternativePaths.FirstOrDefault(System.IO.File.Exists);
                    
                    if (examBrowserPath == null)
                    {
                        return StatusCode(500, new 
                        { 
                            success = false, 
                            error = "Exam browser executable not found. Please ensure ExamBrowser.exe exists.",
                            searchedPaths = new[] { examBrowserPath }.Concat(alternativePaths)
                        });
                    }
                }

                // Close any existing exam browser processes
                await CloseExistingProcesses();

                // Launch the exam browser
                var processStartInfo = new ProcessStartInfo
                {
                    FileName = examBrowserPath,
                    Arguments = $"\"{request.ExamUrl}\"",
                    UseShellExecute = true,
                    CreateNoWindow = false
                };

                var process = Process.Start(processStartInfo);
                
                if (process == null)
                {
                    return StatusCode(500, new { success = false, error = "Failed to start exam browser process" });
                }

                // Store session info
                var sessionId = request.SessionId ?? Guid.NewGuid().ToString();
                _activeSessions[sessionId] = new ProcessInfo
                {
                    StudentId = request.StudentId ?? "unknown",
                    ExamUrl = request.ExamUrl,
                    ProcessId = process.Id,
                    StartTime = DateTime.UtcNow
                };

                _logger.LogInformation($"Exam browser launched for URL: {request.ExamUrl}, Process ID: {process.Id}");

                return Ok(new
                {
                    success = true,
                    message = "Exam browser launched successfully",
                    processId = process.Id,
                    sessionId = sessionId,
                    examUrl = request.ExamUrl
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error launching exam browser");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        [HttpGet("sessions")]
        public IActionResult GetActiveSessions()
        {
            var sessions = _activeSessions.Select(kvp => new
            {
                sessionId = kvp.Key,
                studentId = kvp.Value.StudentId,
                examUrl = kvp.Value.ExamUrl,
                processId = kvp.Value.ProcessId,
                startTime = kvp.Value.StartTime,
                isRunning = IsProcessRunning(kvp.Value.ProcessId)
            }).ToArray();

            return Ok(new { sessions });
        }

        [HttpPost("close/{sessionId}")]
        public async Task<IActionResult> CloseSession(string sessionId)
        {
            if (!_activeSessions.TryGetValue(sessionId, out var session))
            {
                return NotFound(new { success = false, error = "Session not found" });
            }

            try
            {
                if (IsProcessRunning(session.ProcessId))
                {
                    var process = Process.GetProcessById(session.ProcessId);
                    process.Kill();
                    await process.WaitForExitAsync();
                }

                _activeSessions.Remove(sessionId);
                
                return Ok(new { success = true, message = "Session closed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error closing session {sessionId}");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        [HttpPost("close-all")]
        public async Task<IActionResult> CloseAllSessions()
        {
            try
            {
                await CloseExistingProcesses();
                _activeSessions.Clear();
                
                return Ok(new { success = true, message = "All exam browser instances closed" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing all sessions");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        private static async Task CloseExistingProcesses()
        {
            try
            {
                var processes = Process.GetProcessesByName("ExamBrowser");
                foreach (var process in processes)
                {
                    try
                    {
                        process.Kill();
                        await process.WaitForExitAsync();
                    }
                    catch (Exception)
                    {
                        // Process might have already closed
                    }
                    finally
                    {
                        process.Dispose();
                    }
                }
            }
            catch (Exception)
            {
                // Ignore errors if no processes found
            }
        }

        private static bool IsProcessRunning(int processId)
        {
            try
            {
                var process = Process.GetProcessById(processId);
                return !process.HasExited;
            }
            catch
            {
                return false;
            }
        }
    }
}
