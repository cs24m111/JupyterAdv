Due to dependency and package manager conflicts JupyterAdv is spread into three modules.\
Install each module at a time.\
# JupyterAdv Part 1 -\
 This gives ai code assistant features part of JupyterAdv\
 To Install the extension in part 1 -\
 Clone the repository - The jupyterlab_adv folder\
 Open terminal and navigate to this directory\
 Go to virtual environment in which you wish to add the extension - conda activate name_of_environment\
 Type yarn install for dependency installation\
 Then yarn build\
 Then yarn build:labextension\
 Then jupyter labextension install .(Dot is required)\
 This installs jupyterlab extension locally.\
 Open jupyterlab and view the features.\

# JupyterAdv Part 2 -
 This gives version control features part of JupyterAdv\
 Clone repository - \
 Install other necessary packages.\
 nvm install 16\
 nvm use 16\
 pip install jupyter-packaging\
 pip install -ve .(Include .)\
 jupyter labextension link .(Include .)\
 jupyter lab --watch\
 jlpm watch\
 pip install .\
 
 Setup GitHub token\
 Tokens are required to make API calls to GitHub to push commits and create pull requests.\

    Head over developer settings on GitHub. Click "Generate New Token".\
    Select repo scope. Click "Generate Token". Copy the generated token.\
    If ~/.jupyter/jupyter_notebook_config.py does not exist then create one by running jupyter notebook --generate-config\
    Open you Jupyter config file ~/.jupyter/jupyter_notebook_config.py & paste the token as shown below\

c.GitPlus.github_token = '<your-github-access-token>'\
After installation, start JupyterLab normally & you should see "Git-Plus" as a new menu item at the top.\

# JupyterAdv Part 3 -
 This gives the commenting feature part of JupyterAdv\
