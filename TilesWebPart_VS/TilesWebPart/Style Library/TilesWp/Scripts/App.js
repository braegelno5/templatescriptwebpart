"use strict";

var clientContext;
var currentUser;
var userEditListItemsAllowed = false;
var webProperties;
var collListItem;
var tilesTitleId;
var oList;

function TileShadow() {
    $('.Tile-Description').parent().mouseenter(function () {
        $(this).children('.Tile-Description').css('top', '115px');
        $(this).children('.Tile-Description').animate({ top: '-=115' }, 10);
    }).mouseleave(function () {
        $(this).children('.Tile-Description').css('top', '0');
        if ($(this).height() !== 300) {
            $(this).children('.Tile-Description').animate({ top: '+=115' }, 10);
        } else {
            $(this).children('.Tile-Description').animate({ top: '+=275' }, 10);
        }
    });

    if (userEditListItemsAllowed === false) return;

    $(function () {
        $(".column").sortable({
            connectWith: ".column",
            stop: function (event, ui) {
                $(function () {
                    var count = 1;
                    $('.tile').each(function (i, v) {
                        var order = count + ";#" + $(this).parent().attr('id');
                        SP.SOD.executeFunc('sp.js', 'SP.ClientContext', updateListItem($(this).attr('id'), order));
                        count = count + 1;
                        if ($(this).width() === 320) {
                            $(this).parent().width(340);
                        }
                        if ($(this).height() === 320) {
                            $(this).children().css('top', '295px');
                        } else {
                            $(this).children().css('top', '125px');
                        }
                    });
                });
                SP.SOD.executeFunc('sp.js', 'SP.ClientContext', function () { SP.UI.Notify.addNotification('The Tiles are updated!', false); });
            }
        });
    });
}

function updateListItem(itemvalue, order) {

    try {

        if (null === currentUser) return;

        if (!window.tilesListName) return;

        var oList = clientContext.get_web().get_lists().getByTitle(window.tilesListName);
        var oListItem = oList.getItemById(itemvalue);
        oListItem.set_item('TileOrder', order);
        oListItem.update();

        clientContext.executeQueryAsync(Function.createDelegate(this, onQueryitemSucceeded), Function.createDelegate(this, onQueryFailed));
    }
    catch (err) {
        console.log('updateListItem failed. ' + err);
    }
    function onQueryitemSucceeded() {
    }
}

function retrieveListItems() {

    var camlQuery = new SP.CamlQuery();
    camlQuery.set_viewXml('<View><Query><Where><Eq><FieldRef Name=\'Hide\' /><Value Type=\'Boolean\'>False</Value></Eq></Where><OrderBy><FieldRef Name=\'TileOrder\'  Ascending=\'FALSE\' /></OrderBy></Query><ViewFields><FieldRef Name=\'Id\' /><FieldRef Name=\'TileOrder\' /><FieldRef Name=\'Title\' /><FieldRef Name=\'Description1\' /><FieldRef Name=\'BackgroundImageLocation\' /><FieldRef Name=\'LinkLocation\' /><FieldRef Name=\'Color\' /><FieldRef Name=\'LaunchBehavior\' /><FieldRef Name=\'Size\' /></ViewFields></View>');
    collListItem = oList.getItems(camlQuery, 'Include(Id,Title,Description1,BackgroundImageLocation,LinkLocation,Color,LaunchBehavior,TileOrder)');

    clientContext.load(collListItem);

    clientContext.executeQueryAsync(Function.createDelegate(this, onQuerySucceeded), Function.createDelegate(this, onQueryFailed));

    /*
    Description:
    Create the Tiles HTML with all properties
    */
    function onQuerySucceeded() {

        var listItemEnumerator = collListItem.getEnumerator();

        var editImageUrl = window.tilesServerRelativeUrl + 'Style Library/TilesWp/Images/' + (userEditListItemsAllowed === true ? 'EditOption.png' : '1pixel.gif');

        var itemObjects = [];

        while (listItemEnumerator.moveNext()) {

            var oListItem = listItemEnumerator.get_current();

            var tileOrder = oListItem.get_item('TileOrder');
            var substr = tileOrder.split(';#');
            var tilesOrder = parseInt(substr[0]);
            var columnNo = substr[1];
            var launchBehavior = oListItem.get_item('LaunchBehavior');
            var linkLocation = oListItem.get_item('LinkLocation').get_url();
            var size = oListItem.get_item('Size');
            var itemId = oListItem.get_id();
            var color = oListItem.get_item('Color');
            var backgroundImageLocation = oListItem.get_item('BackgroundImageLocation').get_url();
            var title = oListItem.get_item('Title');
            var description = oListItem.get_item('Description1') === null ? '' : oListItem.get_item('Description1');

            var itemObject = { tilesOrder: tilesOrder, columnNo: columnNo, launchBehavior: launchBehavior, linkLocation: linkLocation, size: size, itemId: itemId, color: color, backgroundImageLocation: backgroundImageLocation, title: title, description: description };
            itemObjects.push(itemObject);
        }
        itemObjects.sort(function (a, b) { return a.tilesOrder - b.tilesOrder; });

        for (var io in itemObjects) {

            itemObject = itemObjects[io];

            var linkBehavior = '';
            var customAttribute = '';

            if (itemObject.launchBehavior.indexOf(";") >= 0 && itemObject.launchBehavior.indexOf(":") >= 0) {
                var launchBehaviorArr = itemObject.launchBehavior.split(';');
                launchBehavior = launchBehaviorArr[0];
                var customAttributeArr = launchBehaviorArr[1].split(':');
                customAttribute = ' ' + customAttributeArr[0] + '="' + customAttributeArr[1] + '" ';
                var params = [];
                params.push(customAttributeArr[0] + ':' + customAttributeArr[1]);
                if (customAttributeArr.length > 2) {
                    for (var i = 3, len = customAttributeArr.length; i < len; i++) {
                        params.push(customAttributeArr(i));
                    }
                }
                try {
                    //Create the function
                    var fn = window[customAttributeArr[1]];
                    // Calling the function using the array with apply()
                    fn.apply(this, params);
                }
                catch (err) {
                    console.log('plugIn call failed. ' + err);
                }
            }

            if (customAttribute !== "") {
                customAttribute += " onclick='return false;'";
            }

            if (launchBehavior === "Dialog") {
                var pageUrl = "ShowDialogTile(\"" + itemObject.linkLocation + "\",\"" + itemObject.title + "\")";
                linkBehavior = "<a href='#' onclick='" + pageUrl + ";return false;'" + customAttribute + ">";
            }
            else if (launchBehavior === "New Tab") {
                linkBehavior = "<a href='" + itemObject.linkLocation + "' target='_blank'" + customAttribute + ">";
            }
            else {
                linkBehavior = "<a href='" + itemObject.linkLocation + "'" + customAttribute + ">";
            }

            var columnDomObject = $("#" + itemObject.columnNo);
            var tileStyle = '';
            var tileDescriptionStyle = '';

            if (itemObject.size === "LARGE") {
                columnDomObject.css('width', '320px');
                columnDomObject.css('height', '320px');
                tileStyle = 'width:300px;height:300px;';
                tileDescriptionStyle = " style='width:300px;top:275px;height:300px'";
            } else if (itemObject.size === "WIDE") {
                columnDomObject.css('width', '320px');
                tileStyle = 'width:300px;';
                tileDescriptionStyle = " style='width:300px;'";
            }

            columnDomObject.append("<div id='" + itemObject.itemId + "' class='tile " + itemObject.color + "' style='" + tileStyle + "background-image:url(" + itemObject.backgroundImageLocation + ");'><div class='Tile-Description'" + tileDescriptionStyle + ">" + linkBehavior + "<div style='float:left;width:80%;text-align:left;'>" + itemObject.title + "</div></a><div style='float:right;width:20%;text-align:right'><a href='#' onclick='ShowDialog(" + itemObject.itemId + ")' style='text-align:right;z-index:1000'><img src='" + editImageUrl + "' /></a></div>" + linkBehavior + "<div style='height:90%'><p>" + itemObject.description + "</p></div></a></div></div>");

        }

        TileShadow();
    }
}

/*
Description:
Return Propertybag "vti_TilesColumns" and create the columns where will be the Tiles
*/
function getWebPropertiesSucceeded() {

    var ttc = 3;
    try {
        var vtiTc = webProperties.get_item('vti_TilesColumns');
        ttc = vtiTc;
    } catch (err) { }

    var htmlColumns = '';
    for (var i = 0; i < ttc; i++) {
        htmlColumns += '<div class="column" id="Col' + i + '"></div>';
    }
    $('#' + tilesTitleId).after(htmlColumns);

    getUserAndListItems();
}

/*
Description:
Sets the currentUser if not anonymous
*/
function getUserAndListItems() {

    currentUser = clientContext.get_web().get_currentUser();
    clientContext.load(currentUser);
    clientContext.executeQueryAsync(Function.createDelegate(this, onGetUserSuccess), Function.createDelegate(this, onQueryFailed));

    function onGetUserSuccess() {

        if (null !== currentUser) {
            //The user is not null
            try {
                currentUser.retrieve();
            } catch (err) {
                console.error('getUser failed. ' + err);
                currentUser = null;
                userEditListItemsAllowed = false;
            }
            if (null !== currentUser) {

                oList = clientContext.get_web().get_lists().getByTitle(window.tilesListName);
                clientContext.load(oList, 'EffectiveBasePermissions');
                clientContext.executeQueryAsync(function () {
                    // Success returned from executeQueryAsync
                    if (oList.get_effectiveBasePermissions().has(SP.PermissionKind.editListItems)) {
                        userEditListItemsAllowed = true;
                    }
                    retrieveListItems();
                }, Function.createDelegate(this, onQueryFailed));
            }
        }
    }
}

/*
Description:
Returns error 
*/
function onQueryFailed(sender, args) {
    var errTxt = 'Query failed. Error:' + args.get_message();
    if (typeof window.console != 'undefined') {
        console.error(errTxt);
    }
}

function TilesGetColumns(id) {

    tilesTitleId = id;

    clientContext = SP.ClientContext.get_current();
    webProperties = clientContext.get_web().get_allProperties();
    clientContext.load(webProperties);
    clientContext.executeQueryAsync(Function.createDelegate(this, getWebPropertiesSucceeded), Function.createDelegate(this, onQueryFailed));
}

function ShowDialog(id) {

    if (null !== currentUser) {
        var options = {
            url: window.tilesServerRelativeUrl + "Lists/Tiles/EditForm.aspx?ID=" + id,
            allowMaximize: true,
            title: "Edit Tile",
            dialogReturnValueCallback: showCallback
        };
        SP.SOD.execute('sp.ui.dialog.js', 'SP.UI.ModalDialog.showModalDialog', options);
    }
    return false;
}

function showCallback(dialogResult) {

    if (dialogResult === SP.UI.DialogResult.OK) {
        SP.UI.ModalDialog.RefreshPage(SP.UI.DialogResult.OK);
    }
}

function ShowDialogTile(pageUrl, title) {

    var options = {
        url: pageUrl,
        allowMaximize: true,
        title: title
    };
    SP.SOD.execute('sp.ui.dialog.js', 'SP.UI.ModalDialog.showModalDialog', options);
    return false;
}

$(document).ready(function () {
    SP.SOD.executeFunc('sp.js', 'SP.ClientContext', TilesGetColumns('TitleSettings'));
});