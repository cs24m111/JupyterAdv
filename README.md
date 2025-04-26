JupyterAdv is spread into three modules.\
Install each module at a time.\
First create a conda environment.\
Install yarn, pip, nodejs using conda install package_manager_name.\
Install jupyter lab using conda install -c conda-forge jupyterlab.\
Make sure this are installed.\

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
 This gives the commenting feature part of JupyterAdv.

#JupyterAdv Part 3 -
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
 This installs the server extension locally.\
 Open jupyterlab and side bar for vcs.\
 To use vcs -\
 Clone a github repository and go that repository in terminal.\
 Open jupyterlab with this installed extension in this repository directory.\
 Enter git details in vcs.\
 Create local commits in vcs.\
 This are basic features implemented as part of github vcs and other parts are still under development.
 
