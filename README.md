Install package and SmartClient runtime(s):

     npm install smartclient-lgpl [flags]

Update/reconfigure SmartClient runtime(s) (must be run from package directory):

     npm run update [flags]

where the supported flags are:

     --location=<directory>  where to install the SmartClient runtime(s);
                             default is to place runtime root (isomorphic)
                             in the parent of the node_modules directory
                             containing the smartclient-lgpl package

     --branch=<number>       desired branch (e.g. 11.1); default is 12.0

     --date=<date|'latest'>  desired build date, in format YYYY-MM-DD,
                             or 'latest'; default is 'latest'

     --runtime=<'release'|'debug'|'both'>
                             which runtime(s) to install; default is 'both'

     --skins[=<boolean>]     whether to install all skins or not;
                             default is to only install Tahoe

     --yes[=<boolean>]       assume answer 'yes' to prompts with default
     
     --excludeDefinition[=<boolean>] exclude definition or not;
                                     default is to exclude

After installation, command-line configuration is persisted, so command-line arguments only
need to be supplied when updating if the desired configuration has changed.  

Note that since 'npm update' no longer runs a package's update script, you must use the
syntax above to update the runtime(s) if the package has already been installed.

Examples:

New install, selecting a specific branch and date:

     npm install smartclient-lgpl --branch=11.1 --date=2018-12-30

Update to latest nighlty build (run from package directory):

     npm run update --date=latest

Update to SmartClient 12.0 branch, installing all skins:

     npm run update --branch=12.0 --skins

