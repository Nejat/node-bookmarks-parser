var
  jsdom = require("jsdom");

exports.name = "netscape";

exports.canParse = function(html, callback) {
  callback(null, true);
};

exports.parse = function(html, callback) {
  var rootFoldersRegEx = /^Menu|Unsorted|Toolbar$/i;
  try{
    html = html.replace("<DD>Add bookmarks to this folder to see them displayed on the Bookmarks Toolbar", "");
    jsdom.env( html, function( err, window ) {
      if( err ){
        return callback(err);
      }
      function _getNodeData( node ){

        var data = {};
        var tags;
        var addDate;

        for( var i = 0; i != node.childNodes.length; i++ ){
          var childNode = node.childNodes[i];

          if( childNode.tagName == "A" ){
            // is bookmark
            data.type = "bookmark";
            data.url = childNode.getAttribute("href");
            tags = childNode.getAttribute("tags");
            if (tags) {
              data.tags = tags;
            }
            addDate = childNode.getAttribute("add_date");
            if (addDate) {
              data.addDate = addDate;
          }
            data.title = childNode.textContent;
          }
          else if( childNode.tagName == "H3" ){
            // is folder
            data.type = "folder";
            tags = childNode.getAttribute("tags");
            if (tags) {
              data.tags = tags;
            }
            addDate = childNode.getAttribute("add_date");
            if (addDate) {
              data.addDate = addDate;
            }
            data.title = childNode.textContent;
          }
          else if( childNode.tagName == "DL" ){
            data.__dir_dl = childNode;
          }
        }

        return data;

      }

      function processDir( dir, level ){
        var children = dir.childNodes,
            menuRoot = null;

        var items = [];

        for( var i = 0; i != children.length; i++ ){
          var child = children[i];
          if(!child.tagName) {
            continue;
          }
          if( child.tagName != "DT" ){
            continue;
          }
          var itemData = _getNodeData( child );
          if( itemData.type ){
            if(level === 0) {
              if(itemData.title == "Unsorted Bookmarks") {
                itemData.title = "Unsorted";
              }
              if(itemData.title == "Bookmarks Menu") {
                itemData.title = "Menu";
              }
              if(itemData.title == "Bookmarks Toolbar") {
                itemData.title = "Toolbar";
              }
            }

            if(level === 0 && !rootFoldersRegEx.test(itemData.title)) {
              // create menu root if need
              if(!menuRoot) {
                menuRoot = {
                  title: "Menu",
                  children: []
                };
              }
              if( itemData.type == "folder" && itemData.__dir_dl ){
                itemData.children = processDir( itemData.__dir_dl, level + 1 );
                delete itemData.__dir_dl;
              }
              menuRoot.children.push(itemData);
            }
            else {
              if( itemData.type == "folder" && itemData.__dir_dl ){
                itemData.children = processDir( itemData.__dir_dl, level + 1 );
                delete itemData.__dir_dl;
              }
              items.push( itemData );
            }
          }
        }
        if(menuRoot) {
          items.push(menuRoot);
        }
        return items;
      }

      var dls = window.document.getElementsByTagName("DL");

      if( dls.length > 0 ){
        callback(null, processDir( dls[0], 0 ));
      }
      else{
        callback(new Error("Bookmarks file malformed"));
      }

    });

  }
  catch( ex ){
    return callback(ex);
  }
};