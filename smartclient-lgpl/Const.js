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

"use strict";

/**
 * Class holds various contants.
 */
class Const {

///////////////////////////////////////////////////////////////////////////////
// Constants used in Install class.
///////////////////////////////////////////////////////////////////////////////

    /**
     * Directory name for SSL certificates.
     *
     * @type {string}
     */
    static get CERT() {
        return "cert";
    }

    /**
     * Directory name for configuration files.
     *
     * @type {string}
     */
    static get CONF() {
        return "conf";
    }

    /**
     * Temporary directory name for extracting SmartClient runtime.
     *
     * @type {string}
     */
    static get TMP() {
        return "tmp";
    }

    /**
     * File name for package configuration.
     *
     * @type {string}
     */
    static get SMARTCLIENT_CONF() {
        return "config.json";
    }

    /**
     * Temporary file name for downloaded SmartClient runtime zip.
     *
     * @type {string}
     */
    static get SMARTCLIENT_ZIP() {
        return "SmartClient.zip";
    }

    /**
     * Temporary file name for downloaded optional module zip.
     *
     * @type {string}
     */
    static get MODULE_ZIP() {
        return "Module.zip";
    }

    /**
     * SmartClient product official name.
     *
     * @type {string}
     */
    static get SMARTCLIENT_NAME() {
        return "LGPL";
    }

    /**
     * Base URL for SmartClient runtime zip.
     *
     * @type {string}
     */
    static get SMARTCLIENT_LINK() {
        return "https://www.smartclient.com/builds/SmartClient";
    }

    /**
     * Name of SmartClient download directory under SMARTCLIENT_LINK.
     *
     * @type {string}
     */
    static get DOWNLOAD_DIR() {
        return "LGPL";
    }

    /**
     * Special date that represents latest build.
     *
     * @type {string}
     */
    static get LATEST_BUILD() {
        return "latest";
    }

    /**
     * Whether package requires download account.
     *
     * @type {boolean}
     */
    static get REQUIRES_ACCOUNT() {
        return false;
    }

    /**
     * Whether package supports optional modules.
     *
     * @type {boolean}
     */
    static get SUPPORTS_MODULES() {
        return false;
    }

    /**
     * Relative path to release modules.
     *
     * @type {string}
     */
    static get RELEASE_MODULES() {
        return "system/modules";
    }

    /**
     * Relative path to debug modules.
     *
     * @type {string}
     */
    static get DEBUG_MODULES() {
        return "system/modules-debug";
    }

    /**
     * Analytics module JS file name.
     *
     * @type {string}
     */
    static get ANALYTICS_FILE() {
        return "ISC_Analytics.js";
    }

    /**
     * RealTimeMessaging module JS file name.
     *
     * @type {string}
     */
    static get MESSAGING_FILE() {
        return "ISC_RealtimeMessaging.js";
    }

    /**
     * Analytics module human-readable name.
     *
     * @type {string}
     */
    static get ANALYTICS_NAME() {
        return "Analytics";
    }

    /**
     * RealTimeMessaging module human-readable name.
     *
     * @type {string}
     */
    static get MESSAGING_NAME() {
        return "RealtimeMessaging";
    }

    /**
     * SmartClient development branch.
     *
     * @type {string}
     */
    static get DEVELOP_BRANCH() {
        return "13.1";
    }

    /**
     * SmartClient default branch (latest release).
     *
     * @type {string}
     */
    static get DEFAULT_BRANCH() {
        return "13.0";
    }

    /**
     * SmartClient oldest maintained branch.
     *
     * @type {string}
     */
    static get OLDEST_BRANCH() {
        return "10.1";
    }

    
    /**
     * Default runtime(s) to install.
     *
     * @type {string}
     */
    static get DEFAULT_RUNTIME() {
        return "both";
    }

    /**
     * Default skin to install (when not installing all skins).
     *
     * @type {string}
     */
    static get DEFAULT_SKIN() {
        return "Tahoe";
    }

    /**
     * Name of SmartClient runtime directory.
     *
     * @type {string}
     */
    static get SMARTCLIENT_DIR() {
        return "smartclientRuntime";
    }

    /**
     * Name of isomorphic directory.
     *
     * @type {string}
     */
    static get ISOMORPHIC_DIR() {
        return "isomorphic";
    }

    /**
     * Name of isomorphic definition file.
     *
     * @type {string}
     */
    static get ISOMORPHIC_DEFINITION_FILENAME() {
        return "smartclient.d.ts";
    }

}

module.exports = Const;
