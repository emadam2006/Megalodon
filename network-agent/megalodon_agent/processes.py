import psutil


class ProcessCorrelator:
    @staticmethod
    def get_process_info(pid: int | None) -> tuple[str | None, str | None]:
        """
        Retrieves process name and command line safely given a PID.
        Returns:
            (process_name, command_line)
        """
        if not pid or pid <= 0:
            return None, None

        try:
            proc = psutil.Process(pid)
            name = proc.name()
            try:
                cmdline = " ".join(proc.cmdline())
            except Exception:
                cmdline = name
            return name, cmdline
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            return "Process information unavailable", None
        except Exception:
            return "Process information unavailable", None
