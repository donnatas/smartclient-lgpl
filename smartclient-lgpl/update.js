#!/usr/bin/env node

/*

  Isomorphic SmartClient Node.js Server
  Copyright 2018 and beyond Isomorphic Software, Inc. All rights reserved.
  "SmartClient" is a trademark of Isomorphic Software, Inc.

  LICENSE NOTICE
     INSTALLATION OR USE OF THIS SOFTWARE INDICATES YOUR ACCEPTANCE
     OF ISOMORPHIC SOFTWARE LICENSE TERMS. If you have received this file
     without an accompanying Isomorphic Software license file, please
     contact licensing@isomorphic.com for details. Unauthorized copying and
     use of this software is a violation of international copyright law.

  LGPL LICENSE
     This software may be used under the terms of the Lesser GNU Public License (LGPL),
     version 3.0 (see http://www.gnu.org/licenses/lgpl-3.0.html).  The LGPL is generally
     considered a commercial-friendly license, and is used by the Hibernate framework
     among others.  For any questions about the LGPL, please refer to a qualified attorney;
     Isomorphic does not provide legal advice.

  OTHER LICENSE OPTIONS
     Alternative licensing terms, including licenses with no requirement to make modifications
     publicly available, can be arranged by contacting Isomorphic Software by email
     (licensing@isomorphic.com) or web (www.isomorphic.com).

*/

/* global __dirname, Update */

const fs = require("fs-extra");
const path = require("path");
const https = require("https");
const unzip = require("unzipper");
const npmurl = require("url");
const ps = require("prompt-sync")();

// local dependency - constants
const Const = require("./Const");

let config = {};
let configDir = path.join(__dirname, Const.SMARTCLIENT_CONF);

/**
 * class for SmartClient runtime install/update
 */
class Update {

    /**
     * installs/updates SmartClient runtime
     */
    static main() {
        // load persistent package configuration
        if (fs.existsSync(configDir)) {
            config = fs.readJsonSync(configDir);
        }

        // for update, show details of current installation
        if (config.date) {
            let isomorphicPath = path.join(__dirname, config.location, Const.ISOMORPHIC_DIR);
            console.log("SmartClient " + config.branch + ", build " + config.date +
                ", runtime(s) are currently installed at " + isomorphicPath +
                " according to configuration.");
        }

        let env = process.env, username, password;

        if (Const.REQUIRES_ACCOUNT) {
            console.log("SmartClient " + Const.SMARTCLIENT_NAME +
                " requires download credentials.  Checking.");

            // we need a username to download SmartClient SDK for this package
            username = env.npm_config_username || config.username;
            if (!username) {
                username = ps("Please provide your SmartClient username: ");
                if (!username) {
                    console.log("*** No username provided!");
                    process.exitCode = 4;
                    return;
                }
            }

            // we need a password to download SmartClient SDK for this package
            password = env.npm_config_password || config.password;
            if (!password) {
                password = ps("Please provide your SmartClient password: ", {echo: "*"});
                if (password) {
                    console.log(
                        "\nFor security, the requested password will not be persisted.");
                    console.log(
                        "Please use command-line password option to store a password.\n");
                } else {
                    console.log("*** No password provided!");
                    process.exitCode = 5;
                    return;
                }
            }
        }

        // installation directory
        // we want the default location to be outside the package so it survives uninstall, but
        // if we put it in node_modules, the parent, it will be interpreted as an npm package
        let location = env.npm_config_install_location || config.location ||
            path.resolve(__dirname, "..", "..");

        // date
        let configDate = config.latest ? Const.LATEST_BUILD : config.date;
        let date = env.npm_config_date || configDate || Const.LATEST_BUILD;

        if (!date.match(/^2[0-9]{3}-[0-9]{2}-[0-9]{2}$/) && date !== Const.LATEST_BUILD) {
            console.log("***Invalid date: " + date + "!\n");
            this.usage();
            process.exitCode = 1;
            return;
        }

        // branch
        let branch = env.npm_config_branch || config.branch || Const.DEFAULT_BRANCH;
        if (branch < Const.OLDEST_BRANCH || branch > Const.DEVELOP_BRANCH ||
            !branch.match(/^1[0-9]\.[0-1]$/)) {
            console.log("*** Invalid branch: " + branch + "!\n");
            this.usage();
            process.exitCode = 2;
            return;
        }

        // runtime
        let runtime = env.npm_config_runtime || config.runtime || Const.DEFAULT_RUNTIME;
        if (runtime !== "debug" && runtime !== "release" && runtime !== "both") {
            console.log("*** Invalid runtime: " + runtime + "!\n");
            this.usage();
            process.exitCode = 3;
            return;
        }

        // skins
        let skins = env.npm_config_skins != null ? env.npm_config_skins : config.skins;

        // yes (skip prompt where default is "yes")
        let yes = env.npm_config_yes != null ? env.npm_config_yes : config.yes;

        // prompt for install/update
        let isomorphicPath = path.join(__dirname, location, Const.ISOMORPHIC_DIR),
            prompt = "Install SmartClient " + branch + " runtime, build date " +
                date + ", at " + isomorphicPath;

        if (fs.existsSync(isomorphicPath) && (!config.location || config.location !== location)) {
            prompt += " (removing the directory currently present at install path)"
        }

        let answer = Update._prompt(prompt + "? [yes]: ", yes);
        if (answer != null && (answer.trim() === "" || answer.match(/^y(es)?$/i))) {
            let query = Const.REQUIRES_ACCOUNT ?
                "?USERNAME=" + username + "&PASSWORD=" + encodeURIComponent(password) : "";
            Update._getSmartClientLink(branch, date, query, Const.DOWNLOAD_DIR,
                function (link) {
                    let excludeDefinition = env.npm_config_install_location || config.excludeDefinition || true;
                    let alternateLink
                    if (env.npm_config_alternate_download_link) {
                        alternateLink = env.npm_config_alternate_download_link + "/" + date + "/" + Update._getSmartClientZipName(branch, date)
                    }
                    Update._updateRuntimeCore(location, link, alternateLink, query, branch, date, runtime,
                        skins, username, yes, excludeDefinition);
                }
            );
        }
    }

    /**
     * (Internal) Actual install/update of core runtime(s).
     * Creates directory tree.
     * Copies configuration file.
     *
     * @param {string} location - destination path
     * @param {string} link - download URL
     * @param {string} query - download credentials
     * @param {number} branch - SmartClient branch
     * @param {string} date - build date
     * @param {string} runtime - "release", "debug", or "both"
     * @param {boolean} skins - install all skins
     * @param {string} username - account username
     * @param {boolean} yes - answer "yes" to prompt
     * @param {boolean} excludeDefinition - exclude definition file
     */
    static _updateRuntimeCore(location, link, alternateLink, query, branch, date, runtime, skins, username,
                              yes, excludeDefinition) {
        // if not present, create destination directory with user RWX access
        fs.ensureDirSync(location, {mode: 0o700});

        // test if destination directory is accessible for reading and writing
        fs.access(location, fs.constants.R_OK | fs.constants.W_OK, function (err) {
            if (err) {
                console.error("ERROR! Can not access destination directory: " + location);
                process.exit(-100);
            }

            let realDate = link.match(/2[0-9]{3}-[0-9]{2}-[0-9]{2}/)[0];

            let isomorphicPath = path.join(__dirname, location, Const.ISOMORPHIC_DIR);
            fs.pathExists(isomorphicPath, function (err, exists) {
                if (exists) {
                    // ask user to skip if there's no newer build and no configuration has changed
                    if (location === config.location &&
                        branch === config.branch &&
                        realDate === config.date &&
                        runtime === config.runtime &&
                        !skins === !config.skins &&
                        excludeDefinition === config.excludeDefinition) {
                        let skip = Update._prompt(
                            "It looks like we're about to re-download the same core runtime(s) " +
                            "already installed with no configuration change.  Skip? [yes]: ", yes);
                        if (skip != null && (skip.trim() === "" || skip.match(/^y(es)?$/i))) {

                            // update "yes" option even though new runtime core(s) wont' be installed
                            if (yes !== config.yes) {
                                if (yes) config.yes = true;
                                else delete config.yes;

                                fs.writeJsonSync(configDir, config, {spaces: 4});
                                console.log("Configuration updated.");
                            }

                            console.log("Skipping re-installation.\n");

                            if (Const.SUPPORTS_MODULES) {
                                Update._startOptionalModulesUpdate(location, query, branch, date,
                                    runtime);
                            }
                            process.exit();
                        }
                    }
                }
            })

            // downloading and installing SmartClient runtime
            const tmpDirName = path.join(__dirname, Const.TMP);
            fs.ensureDirSync(tmpDirName);

            const zipFileName = path.join(tmpDirName, Const.SMARTCLIENT_ZIP);

            const proccessFile = function (response) {
                let currentLen = 0,
                    totalLen = parseInt(response.headers['content-length'])
                ;

                console.log("Downloading...");

                let lastSecond = 0;
                response.on("data", function (chunk) {
                    currentLen += chunk.length;
                    let hrtime = process.hrtime();
                    if (lastSecond !== hrtime[0]) {
                        lastSecond = hrtime[0];

                        console.log("Downloading " +
                            Math.floor(currentLen * 100 / totalLen) + "% complete.");
                    }
                });

                response.pipe(fs.createWriteStream(zipFileName));
                response.on("end", function () {
                    process.stdout.write("Downloading 100% complete (" + totalLen +
                        " bytes transferred).\n");

                    console.log("Unzipping SmartClient runtime file " + zipFileName +
                        " to " + tmpDirName);

                    const zipFile = fs.createReadStream(zipFileName);
                    zipFile.pipe(unzip.Extract({
                        path: tmpDirName
                    })).on("close", function () {

                        if (config.location) { // remove existing installation, if any
                            let oldPath = path.join(__dirname, config.location, Const.ISOMORPHIC_DIR);
                            console.log("Removing old SmartClient runtime(s) at " + oldPath);
                            fs.removeSync(oldPath);
                        }

                        let isomorphicPath = path.join(__dirname, location, Const.ISOMORPHIC_DIR);
                        console.log("Copying SmartClient runtime(s) to " + isomorphicPath);

                        fs.removeSync(isomorphicPath);

                        let packageDir = fs.readdirSync(tmpDirName).filter(function (f) {
                            return f.startsWith("SmartClient_");
                        })[0];

                        fs.copySync(path.join(tmpDirName, packageDir, Const.SMARTCLIENT_DIR,
                            Const.ISOMORPHIC_DIR), isomorphicPath, {
                            filter: function (src, dest) {
                                // exclude unwanted definition file
                                if (excludeDefinition && src.endsWith(Const.ISOMORPHIC_DEFINITION_FILENAME)) {
                                    return false;
                                }

                                // exclude unwanted runtimes
                                if (runtime === "release" &&
                                    dest.endsWith(Const.DEBUG_MODULES) ||
                                    runtime === "debug" &&
                                    dest.endsWith(Const.RELEASE_MODULES)) {
                                    return false;
                                }
                                // exclude unwanted skins
                                return !(!skins && dest.match(/skins\/[a-z]+$/i) &&
                                    !dest.endsWith("skins/" + Const.DEFAULT_SKIN));

                            }
                        });

                        if (excludeDefinition) {
                            console.log("Excluded isomorphic definition file " + Const.ISOMORPHIC_DEFINITION_FILENAME)
                        }

                        if (runtime === "both") {
                            console.log("Installed debug and release runtimes.");
                        } else {
                            console.log("Installed " + runtime + " runtime.");
                        }

                        if (skins) {
                            console.log("Installed all skins.");
                        } else {
                            console.log("Installed " + Const.DEFAULT_SKIN + " skin.");
                        }

                        console.log("See command-line documentation for alternatives.");

                        let env = process.env;

                        // persist configuration
                        config.location = location;
                        config.runtime = runtime;
                        config.branch = branch;
                        config.date = realDate;
                        config.excludeDefinition = excludeDefinition;

                        if (date === Const.LATEST_BUILD) config.latest = true;
                        else delete config.latest;

                        if (skins) config.skins = true;
                        else delete config.skins;

                        if (yes) config.yes = true;
                        else delete config.yes;

                        // persist credentials (only persist password if on the command line)
                        if (Const.REQUIRES_ACCOUNT) {
                            config.username = username;
                            if (env.npm_config_password) {
                                config.password = env.npm_config_password;
                            }
                        }

                        fs.writeJsonSync(configDir, config, {spaces: 4});

                        console.log("Configuration updated.");

                        console.log("Deleting temporary files from " + tmpDirName);
                        fs.removeSync(tmpDirName);

                        if (Const.SUPPORTS_MODULES) {
                            console.log("Installation of runtime core complete.\n");
                            Update._startOptionalModulesUpdate(location, query, branch, date,
                                runtime);
                        } else {
                            console.log("Installation complete.");
                        }
                    });
                });
            }

            Update._httpsGet(link + query, function (response) {
                console.log("Downloading SmarClient runtime from " + link);
                if (response.statusCode !== 200) {
                    console.error("Failed to download SmartClient runtime from: " + link);
                    Update._httpsGet(alternateLink + query, function (response) {
                        console.log("Downloading SmarClient runtime from " + alternateLink);
                        if (response.statusCode !== 200) {
                            console.error("Failed to download SmartClient runtime from: " + alternateLink);
                            process.exit(-101);
                        } else {
                            proccessFile(response)
                        }
                    });
                } else {
                    proccessFile(response)
                }
            });
        });
    }

    /**
     * (Internal) Start install/update of optional modules.
     * Updates configuration file.
     *
     * @param {string} location - destination path
     * @param {string} query - download credentials
     * @param {number} branch - SmartClient branch
     * @param {string} date - build date
     * @param {string} runtime - "release", "debug", or "both"
     */
    static _startOptionalModulesUpdate(location, query, branch, date, runtime) {
        console.log("Updating optional modules.");
        Update._updateAnalyticsModule(location, query, branch, date, runtime);
    }

    /**
     * (Internal) Complete install/update of optional modules.
     * Updates configuration file.
     * @param updated
     */
    static _completeOptionalModulesUpdate(updated) {
        let status = "Done updating optional modules.";

        if (updated) {
            status += "  Configuration updated.";
            fs.writeJsonSync(configDir, config, {spaces: 4});
        }

        console.log(status);
    }

    /**
     * (Internal) Install/update analytics module.
     * Updates configuration file.
     *
     * @param {string} location - destination path
     * @param {string} query - download credentials
     * @param {number} branch - SmartClient branch
     * @param {string} date - build date
     * @param {string} runtime - "release", "debug", or "both"
     */
    static _updateAnalyticsModule(location, query, branch, date, runtime) {
        let updated, config_analytics = process.env.npm_config_analytics;

        let analytics = config_analytics != null ? config_analytics : config.analytics;
        if (analytics) {
            Update._getSmartClientLink(branch, date, query, Const.ANALYTICS_NAME + "Module",
                function (link) {
                    Update._updateModule(location, link, query, branch, date, runtime,
                        Const.ANALYTICS_NAME,
                        function () {
                            if (!config.analytics) {
                                config.analytics = true;
                                updated = true;
                            }
                            Update._updateMessagingModule(location, query, branch, date,
                                runtime, updated);
                        }
                    );
                }
            );
            return;
        }
        if (config.analytics) {
            Update._removeModule(location, Const.ANALYTICS_NAME, Const.ANALYTICS_FILE);
            updated = true;
        } else {
            console.log("Not installing the " + Const.ANALYTICS_NAME + " module")
        }
        delete config.analytics;

        Update._updateMessagingModule(location, query, branch, date, runtime, updated);
    }

    /**
     * (Internal) Install/update messaging module.
     * Updates configuration file.
     *
     * @param {string} location - destination path
     * @param {string} query - download credentials
     * @param {number} branch - SmartClient branch
     * @param {string} date - build date
     * @param {string} runtime - "release", "debug", or "both"
     * @param updated
     */
    static _updateMessagingModule(location, query, branch, date, runtime, updated) {
        let config_rtm = process.env.npm_config_rtm;

        let rtm = config_rtm != null ? config_rtm : config.rtm;
        if (rtm) {
            Update._getSmartClientLink(branch, date, query, Const.MESSAGING_NAME + "Module",
                function (link) {
                    Update._updateModule(location, link, query, branch, date, runtime,
                        Const.MESSAGING_NAME,
                        function () {
                            if (!config.rtm) {
                                config.rtm = true;
                                updated = true;
                            }
                            Update._completeOptionalModulesUpdate(updated);
                        }
                    );
                }
            );
            return;
        }
        if (config.rtm) {
            Update._removeModule(location, Const.MESSAGING_NAME, Const.MESSAGING_FILE);
            updated = true;
        } else {
            console.log("Not installing the " + Const.MESSAGING_NAME + " module")
        }
        delete config.rtm;

        Update._completeOptionalModulesUpdate(updated);
    }

    /**
     * (Internal) Actual install/update optional module.
     * Creates directory tree.
     * Copies configuration file.
     *
     * @param {string} location - destination path
     * @param {string} link - download URL
     * @param {string} query - download credentials
     * @param {number} branch - SmartClient branch
     * @param {string} date - build date
     * @param {string} runtime - "release", "debug", or "both"
     * @param {string} moduleName - human-meaningful name of module
     * @param {function} callback
     */
    static _updateModule(location, link, query, branch, date, runtime, moduleName, callback) {

        // downloading and installing optional module
        const tmpDirName = path.join(__dirname, Const.TMP);
        fs.ensureDirSync(tmpDirName);

        const zipFileName = path.join(tmpDirName, Const.MODULE_ZIP);

        console.log("Downloading " + moduleName + " module from " + link);
        Update._httpsGet(link + query, function (response) {
            if (response.statusCode !== 200) {
                console.error("Failed to download " + moduleName + " module from: " + link);
                process.exit(-101);
            }

            let totalLen = parseInt(response.headers['content-length']);

            response.pipe(fs.createWriteStream(zipFileName));
            response.on("end", function () {
                console.log("Downloading 100% complete (" + totalLen +
                    " bytes transferred).");
                console.log("Unzipping " + moduleName + " module file " + zipFileName + " to " +
                    tmpDirName);

                const zipFile = fs.createReadStream(zipFileName);
                zipFile.pipe(unzip.Extract({
                    path: tmpDirName
                })).on("close", function () {

                    let isomorphicPath = path.join(__dirname, location, Const.ISOMORPHIC_DIR);
                    console.log("Installing " + moduleName + " module to " + isomorphicPath);

                    if (runtime === "release" || runtime === "both") {
                        fs.copySync(tmpDirName, path.join(isomorphicPath, Const.RELEASE_MODULES), {
                            overwrite: true,
                            filter: function (src) {
                                return src === tmpDirName || src.match(/\.js(\.gz)?$/);
                            }
                        });
                    }
                    if (runtime === "debug" || runtime === "both") {
                        fs.copySync(path.join(tmpDirName, "modules-debug"),
                            path.join(isomorphicPath, Const.DEBUG_MODULES), {
                                overwrite: true
                            });
                    }

                    console.log("Deleting temporary files from " + tmpDirName);
                    fs.removeSync(tmpDirName);
                    console.log("Installation of module " + moduleName + " complete.");

                    callback.call();
                });
            });
        });
    }

    /**
     * (Internal) Remove optional modules.
     *
     * @param {string} location - runtime install location
     * @param {string} moduleName - human-meaningful name of module
     * @param {string} moduleFile - file name (JS implementation) of module
     */
    static _removeModule(location, moduleName, moduleFile) {
        let isomorphicPath = path.join(__dirname, location, Const.ISOMORPHIC_DIR);
        fs.removeSync(path.join(isomorphicPath, Const.RELEASE_MODULES, moduleFile))
        fs.removeSync(path.join(isomorphicPath, Const.RELEASE_MODULES, moduleFile + ".gz"))
        fs.removeSync(path.join(isomorphicPath, Const.DEBUG_MODULES, moduleFile));
        console.log("Removed " + moduleName + " module.");
    }

    /**
     * (Internal) Get download url.
     *
     * @param {number} branch - SmartClient branch
     * @param {string} date - build date
     * @param {string} query - download credentials
     * @param {string} moduleName - Const.DOWNLOAD_DIR for core runtime(s),
     *                              or optional module name
     * @param {function} callback
     */
    static _getSmartClientLink(branch, date, query, moduleName, callback) {
        let release = branch <= Const.DEFAULT_BRANCH;

        let baseUrl = Const.SMARTCLIENT_LINK,
            linkDir = branch + (release ? "p" : "d") + "/" + moduleName + "/" + date,
            linkUrl = baseUrl + "/" + linkDir
        ;

        if (date === Const.LATEST_BUILD) {
            Update._httpsGet(linkUrl + query, function (response) {
                if (response.statusCode !== 200) {
                    console.error("Failed to get SmartClient directory listing from: " +
                        linkUrl);
                    process.exit(-102);
                }
                response.on('data', function (data) {
                    if (data == null) {
                        console.error("Got empty SmartClient directory listing from: " +
                            linkUrl);
                        process.exit(-103);
                    }
                    let matches = data.toString().match(/[A-Za-z0-9_-]+\.zip/);
                    if (!matches) {
                        console.error("No SmartClient runtimes available from: " + linkUrl);
                        process.exit(-104);
                    }
                    callback.call(null, linkUrl + "/" + matches[0]);
                });
            });
        } else {
            callback.call(null, linkUrl + "/" + Update._getSmartClientZipName(branch, date));
        }
    }

    /**
     * (Internal) Get download file name.
     *
     * @param {number} branch - SmartClient branch
     * @param {string} date - build date
     */
    static _getSmartClientZipName(branch, date) {
        let release = branch <= Const.DEFAULT_BRANCH;

        return "SmartClient_" + (release ? "" : "SNAPSHOT_") + "v" + (branch * 10) +
            (release ? "p" : "d") + "_" + date + "_" + Const.SMARTCLIENT_NAME + ".zip";
    }

    /**
     * (Internal) Send GET with userAgent.
     *
     * @param url
     * @param callback
     */
    static _httpsGet(url, callback) {
        let request = npmurl.parse(url);
        request.headers = {
            "User-Agent": "npmjs / " + process.env.npm_package_name
        };
        https.get(request, function (response) {
            if (response.statusCode === 301 || response.statusCode === 302) {
                Update._httpsGet(response.headers.location, callback);
            } else {
                callback(response);
            }
        });
    }

    /**
     * (Internal) Prompt user and return answer.  Allow automatic "yes".
     *
     * @param prompt
     * @param yes
     */
    static _prompt(prompt, yes) {
        if (yes) {
            let auto = "yes";
            console.log(prompt + auto);
            return auto;
        }
        return ps(prompt);
    }

    /**
     * (Internal) Show update usage information.
     */
    static usage() {

        let package_name = process.env.npm_package_name,
            default_branch = Const.DEFAULT_BRANCH,
            default_skin = Const.DEFAULT_SKIN
        ;
        let usage =
            "Install package and SmartClient runtime(s):\n\n" +
            "     npm install " + package_name + " [flags]\n\n" +
            "Update/reconfigure SmartClient runtime(s) (must be run from package directory):\n\n" +
            "     npm run update [flags]\n\n" +
            "where the supported flags are:\n\n" +
            "     --location=<directory>  where to install the SmartClient runtime(s);\n" +
            "                             default is to place runtime root (" + Const.ISOMORPHIC_DIR + ")\n" +
            "                             in the parent of the node_modules directory\n" +
            "                             containing the " + package_name + " package\n\n" +
            "     --branch=<number>       desired branch (e.g. 11.1); default is " + default_branch + "\n\n" +
            "     --date=<date|'latest'>  desired build date, in format YYYY-MM-DD,\n" +
            "                             or 'latest'; default is 'latest'\n\n" +
            "     --runtime=<'release'|'debug'|'both'>\n" +
            "                             which runtime(s) to install; default is 'both'\n\n" +
            "     --skins[=<boolean>]     whether to install all skins or not;\n" +
            "                             default is to only install " + default_skin + "\n\n" +
            "     --yes[=<boolean>]       assume answer 'yes' to prompts with default\n\n" +
            "     --excludeDefinition[=<boolean>] exclude definition or not;\n\n" +
            "                             default is to exclude\n\n" +

            (Const.REQUIRES_ACCOUNT ? (
                "     --username=<string>     username for account on www.smartclient.com\n\n" +
                "     --password=<string>     password for account on www.smartclient.com\n\n") : "") +

            (Const.SUPPORTS_MODULES ? (
                "     --analytics[=<boolean>] install the optional Analytics module\n\n" +
                "     --rtm[=<boolean>]       install the optional RealtimeMessaging module\n\n") : "") +

            "After installation, command-line configuration is persisted, so command-line arguments only\n" +
            "need to be supplied when updating if the desired configuration has changed.  " +

            (Const.REQUIRES_ACCOUNT ? ("If a username\n" +
                "and password aren't supplied via the above options, you will be prompted to enter them by\n" +
                "the update script.  A password typed in response to the script won't be persisted to your\n" +
                "configuration, so you may choose to always enter it interactively for security.") : "") +
            "\n\n" +

            "Note that since 'npm update' no longer runs a package's update script, you must use the\n" +
            "syntax above to update the runtime(s) if the package has already been installed.\n\n" +
            "Examples:\n\n" +
            "New install, selecting a specific branch and date:\n\n" +
            "     npm install " + package_name + " --branch=11.1 --date=2018-12-30\n\n" +
            "Update to latest nighlty build (run from package directory):\n\n" +
            "     npm run update --date=latest\n\n" +
            "Update to SmartClient 12.0 branch, installing all skins:\n\n" +
            "     npm run update --branch=12.0 --skins\n";

        console.log(usage);
    }

}

// Start install/update process
Update.main();
