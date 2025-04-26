# Source - https://github.com/jupyterlab/jupyterlab-git

# Install package in development mode
pip install -e ".[dev,test]"
pre-commit install
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Server extension must be manually installed in develop mode
jupyter server extension enable jupyterlab_vcs
# Rebuild extension Typescript source after making changes
jlpm run build