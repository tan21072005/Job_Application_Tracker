import sys
import psutil

if len(sys.argv) > 1:
    pid = int(sys.argv[1])
    try:
        parent = psutil.Process(pid)
        for child in parent.children(recursive=True):
            try:
                child.kill()
            except Exception:
                pass
        parent.kill()
    except Exception:
        pass
