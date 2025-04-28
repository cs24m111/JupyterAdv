JupyterAdv is spread into three modules.\
Install each module at a time.\
First create a conda environment.\
Install yarn, pip, nodejs using conda install package_manager_name.\
Install jupyter lab using conda install jupyterlab.\
Make sure this are installed.\
For all modules install necessary jupyter lab versions - 4.4.1

# Contributions -
JupyterAdv Part 1 and Part 3 - Pranay.D\
JupyterAdv Part 2 - Neha and Mounika\
UI and verification - Srivally\

# JupyterAdv Part 1 -
 This gives advanced features part of JupyterAdv.\
 Generate Code, Explain Code, Performance Metrics, Predict Behavior, Error Detection and Bug detection are part of release 1.\
 Library Version, Analyze Visualizations, Code Dependency Monitor and Notebook Statistics are part of release 2.\
 To Install the extension -\
 Clone the repository - The jupyterlab_adv folder.\
 Open terminal and navigate to this directory.\
 Go to virtual environment in which you wish to add the extension - conda activate name_of_environment\
 Type yarn install for dependency installation\
 Then yarn build\
 Then yarn build:labextension\
 Then jupyter labextension install .(Dot is required)\
 This installs jupyterlab extension locally.\
 Open jupyterlab and view the features in tool bar and access them.

# JupyterAdv Part 2 -
 This is part of release 2.\
 This gives the commenting feature part of JupyterAdv in Windows.\
 Clone the repository to your local environment.\
 Change directory to the jupyterlab_com directory.\
 Open terminal.\
 Type Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass\
 Type ts-node src/server.ts\
 This assumes you're on Windows and have ts-node installed.\
 Then jlpm build\
 Then jupyter labextension develop . --overwrite\
 Once JupyterLab opens in your browser, your extension should be active by using jupyter lab\
 This installs the jupyter labextension.\
 Right sidebar has the comment feature.

# JupyterAdv Part 3 -
 Additional requirement - Install or set yarn version as 3.5.0 using npx yarn set version 3.5.0 or normal version.\
 This is part of release 2.\
 This gives the some of version control features to github.\
 To install extension - \
 Clone the repository - The jupyter_vcs folder.\
 Open terminal and navigate to this directory.\
 Go to virtual environment in which you wish to add the extension - conda activate name_of_environment\
 Type yarn install for dependency installation\
 Then pip install -e ".[dev,test]"\
 Then pre-commit install\
 Then jupyter labextension develop . --overwrite\
 Then jupyter server extension enable jupyterlab_vcs\
 Then jlpm run build - Optional (work or may not work based on version of yarn - Need not be runned for normal operation of extension.)\
 This installs the server extension locally.\
 Open jupyterlab and side bar for vcs.\
 To use vcs -\
 Clone a github repository and go that repository in terminal.\
 Open jupyterlab with this installed extension in this repository directory.\
 Enter git details in vcs.\
 Create local commits in vcs.\
 This are basic features implemented as part of github vcs and other parts are still under development.

