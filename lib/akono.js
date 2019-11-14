// Copyright (C) 2018 Taler Systems SA
//
// This file is part of GNU Taler.
// 
// GNU Taler is free software: you can redistribute it and/or modify it under
// the terms of the GNU Lesser General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option)
// any later version.
// 
// GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for
// more details.
// 
// You should have received a copy of the GNU Lesser General Public License
// along with GNU.  If not, see <https://www.gnu.org/licenses/>.


'use strict';

const { akono } = internalBinding("akono");

module.exports = {
  sendMessage: akono.sendMessage,
  getData: akono.getData,
};


mod = require('module');
mod._saved_findPath = mod._findPath;
mod._akonoMods = {};
mod._findPath = (request, paths, isMain) => {
  const res = mod._saved_findPath(request, paths, isMain);
  if (res !== false) return res;
  const args = JSON.stringify({ request, paths});
  const loadResult = JSON.parse(akono.loadModule(args));
  if (!loadResult) return false;
  mod._akonoMods[loadResult.path] = loadResult;
  return loadResult.path;
};

function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

mod._saved_js_extension = mod._extensions[".js"];
mod._extensions[".js"] = (module, filename) => {
  if (mod._akonoMods.hasOwnProperty(filename)) {
    const akmod = mod._akonoMods[filename];
    const content = akmod.content;
    module._compile(stripBOM(content), filename);
    return;
  }
  return mod._saved_js_extension(module, filename);
};

mod._saved_json_extension = mod._extensions[".json"];
mod._extensions[".json"] = (module, filename) => {
  if (mod._akonoMods.hasOwnProperty(filename)) {
    const akmod = mod._akonoMods[filename];
    const content = akmod.content;
    try {
      module.exports = JSON.parse(stripBOM(content));
      return;
    } catch (err) {
      err.message = filename + ': ' + err.message;
      throw err;
    }
  }
  return mod._saved_json_extension(module, filename);
};

