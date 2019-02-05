const Fs = require('fs');
const path = require('path');
const { yamlParse, yamlDump } = require('yaml-cfn');



exports = module.exports = function( pFilename ) {
var oFilePath = path.resolve(__dirname, pFilename);
	var oFileContent = Fs.readFileSync( oFilePath, {encoding: 'utf8'} );
	return yamlParse( oFileContent );
}
