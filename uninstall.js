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

/* global __dirname, Install */

const fs = require("fs-extra");
const path = require("path");
const readline = require("readline");

// local dependency - constants
const Const = require("./Const");

let config = {};

/**
 * class for SmartClient runtime uninstallation
 */
class Uninstall {

    /**
     * uninstalls SmartClient runtime(s)
     */
    static main() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.on("SIGINT", function() {
            // Exit with error if Control-C pressed
            process.exit(0);
        });

        // load persistent package configuration
        if (fs.existsSync(Const.SMARTCLIENT_CONF)) {
            config = fs.readJsonSync(Const.SMARTCLIENT_CONF);
        }

        let location = config.location;
        if (!location) {
            rl.close();
            return;
        }

        // remove installed Framework from configured location
        let isomorphicPath = path.join(location, Const.ISOMORPHIC_DIR);
        rl.question("Uninstalling SmartClient " + config.branch + ", build " + config.date +
                    " runtime(s) installed at " + isomorphicPath + ".  Note that if " + 
                    "you're seeing this during (re)installation, the new installation " +
                    "won't be aware of the old Framework files even if you decide to " + 
                    "keep them.  Remove existing installation? [yes]: ",
                    function (answer) {
                        if (answer.trim() === "" || answer.match(/^y(es)?$/i)) {
                            let isomorphicPath = path.join(location, Const.ISOMORPHIC_DIR);
                            if (fs.existsSync(isomorphicPath)) {
                                rl.write("Removing SmartClient...");
                                fs.removeSync(isomorphicPath);
                                console.log("Done.");
                            } else {
                                console.log("Nothing to do as " + isomorphicPath + 
                                            " doesn't exist!");
                            }
                        }
                        rl.close();
                    }
        );
    }

}

// Start uninstallation process
Uninstall.main();
