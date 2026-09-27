from pathlib import Path
import shutil
from setuptools import setup
from setuptools.command.build_py import build_py

ROOT = Path(__file__).parent


class BuildWithRuntime(build_py):
    def run(self):
        super().run()
        target = Path(self.build_lib) / "atflows" / "_runtime"
        shutil.rmtree(target, ignore_errors=True)
        target.mkdir(parents=True, exist_ok=True)
        for name in ("package.json", "bun.lock"):
            shutil.copy2(ROOT / name, target / name)
        for name in ("apps", "packages", "public", "docs/integrations"):
            shutil.copytree(ROOT / name, target / name, dirs_exist_ok=True,
                            ignore=shutil.ignore_patterns("node_modules", "test", "*.test.*", "*.spec.*", "dist", ".svelte-kit"))
        shutil.copytree(ROOT / "atflows/integrations/hermes", target / "atflows/integrations/hermes",
                        ignore=shutil.ignore_patterns("__pycache__"))


setup(cmdclass={"build_py": BuildWithRuntime})
