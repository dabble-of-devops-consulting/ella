/* jshint esnext: true */

import {Directive, Inject} from '../ng-decorators';


/** Class to contain eventlisteners, so they can be detached using removeAll */
class EventListeners {
    constructor() {
        this.eventListeners = [];
    }

    add(el, type, func) {
        el.addEventListener(type, func);
        this.eventListeners.push({"element": el, "type": type, "function": func});
    }

    remove(el, type, func) {
        el.removeEventListener(type, func);
    }

    removeAll() {
        for (let i=0; i<this.eventListeners.length; i++) {
            let el = this.eventListeners[i];
            this.remove(el.element, el.type, el.function);
        }
    }
}

var DEFAULT_COLOR = {
    HEX: "#F5F5F9",
    RGB: "245, 245, 249"
}


function addColorPicker(el, colors) {
    var picker = vanillaColorPicker(el);
    // document.execCommand('styleWithCSS', false, true);
    picker.set('customColors', colors);
    return picker;
}

function getTree(node) {
    if (node.nodeName === "WYSIWYG-EDITOR") {
        return [node];
    }
    return [node].concat(getTree(node.parentElement))
}


function isInsideTable(nodes) {
    for (let i=0; i<nodes.length; i++) {
        let subtree = getTree(nodes[i]);
        for (let j=0; j<subtree.length; j++) {
            if (subtree[j].nodeName === "TABLE") {
                return true;
            }
        }
    }
    return false;
}

function getCurrentColors(nodes) {
    let highlightcolors = [];
    let fontcolors = [];
    for (let i=0; i<nodes.length; i++) {
        let subtree = getTree(nodes[i]);
        for (let j=0; j<subtree.length; j++) {
            if (subtree[j].style) {
                if (subtree[j].color) {
                    fontcolors = fontcolors.concat(subtree[j].color)
                } else {
                    fontcolors = fontcolors.concat("rgb(0,0,0)")
                }
                break; // Check only first styled element in tree
            }
        }
        for (let j=0; j<subtree.length; j++) {
            if (subtree[j].style && subtree[j].style["background-color"]) {
                if (subtree[j].style["background-color"] !== `rgb(${DEFAULT_COLOR.RGB})`) {
                    highlightcolors = highlightcolors.concat(subtree[j].style["background-color"])
                } else {
                    highlightcolors = highlightcolors.concat('rgb(0,0,0)') // default color
                }
                break; // Check only first styled element in tree
            }
        }
    }
    return {fontcolors: fontcolors, highlightcolors: highlightcolors};
}



@Directive({
    selector: 'wysiwyg-editor',
    scope: {
        placeholder: '@?',
        ngModel: '=',
        ngDisabled: '=?'
    },
    require: '?ngModel', // get a hold of NgModelController
    template: '<div class="wysiwygeditor" spellcheck="false" ng-disabled="vm.ngDisabled" ng-model="comment.model.comment"></div>' +
              '<div class="wysiwygplaceholder"></div> ' +
              '<div class="wysiwygbuttons">' +
                '<button class="wysiwygbutton" id="wysiwyg-src">&lt;&gt;</button>' +
                '<button class="wysiwygbutton" title="Bold (Ctrl+B)" style="font-weight: bold" id="wysiwyg-bold">B</button>' +
                '<button class="wysiwygbutton" title="Italic (Ctrl+I)" id="wysiwyg-italic">I</button>' +
                '<button class="wysiwygbutton" title="Underline (Ctrl+U)" id="wysiwyg-underline">U</button>' +
                '<button class="wysiwygbutton" title="Code/Monospace font" id="wysiwyg-monospace">M</button>' +
                '<button class="wysiwygbutton" title="Set text color" id="wysiwyg-fontcolor">A<span style="color: rgb(0,0,0); vertical-align: sub; margin-left: -0.0rem">&#9646</span></button>' +
                '<button class="wysiwygbutton" title="Set highlight color" id="wysiwyg-highlightcolor"><svg width="60%" height="60%" viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentcolor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path d="M30 7 L25 2 5 22 3 29 10 27 Z M21 6 L26 11 Z M5 22 L10 27 Z" /></svg><span style="color: rgb(0,0,0);">&#9646</span></button>' +
                '<button class="wysiwygbutton" title="Heading 1" id="wysiwyg-heading1">H1</button>' +
                '<button class="wysiwygbutton" title="Heading 2" id="wysiwyg-heading2">H2</button>' +
                '<button class="wysiwygbutton" title="Normal text" id="wysiwyg-paragraph">P</button>' +
                '<button class="wysiwygbutton" title="Numbered list" id="wysiwyg-orderedList"><svg width="60%" height="100%" fill="currentcolor" stroke="currentcolor" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path d="M381 1620q0 80-54.5 126t-135.5 46q-106 0-172-66l57-88q49 45 106 45 29 0 50.5-14.5t21.5-42.5q0-64-105-56l-26-56q8-10 32.5-43.5t42.5-54 37-38.5v-1q-16 0-48.5 1t-48.5 1v53h-106v-152h333v88l-95 115q51 12 81 49t30 88zm2-627v159h-362q-6-36-6-54 0-51 23.5-93t56.5-68 66-47.5 56.5-43.5 23.5-45q0-25-14.5-38.5t-39.5-13.5q-46 0-81 58l-85-59q24-51 71.5-79.5t105.5-28.5q73 0 123 41.5t50 112.5q0 50-34 91.5t-75 64.5-75.5 50.5-35.5 52.5h127v-60h105zm1409 319v192q0 13-9.5 22.5t-22.5 9.5h-1216q-13 0-22.5-9.5t-9.5-22.5v-192q0-14 9-23t23-9h1216q13 0 22.5 9.5t9.5 22.5zm-1408-899v99h-335v-99h107q0-41 .5-122t.5-121v-12h-2q-8 17-50 54l-71-76 136-127h106v404h108zm1408 387v192q0 13-9.5 22.5t-22.5 9.5h-1216q-13 0-22.5-9.5t-9.5-22.5v-192q0-14 9-23t23-9h1216q13 0 22.5 9.5t9.5 22.5zm0-512v192q0 13-9.5 22.5t-22.5 9.5h-1216q-13 0-22.5-9.5t-9.5-22.5v-192q0-13 9.5-22.5t22.5-9.5h1216q13 0 22.5 9.5t9.5 22.5z"/></svg></button> ' +
                '<button class="wysiwygbutton" title="Bullet list" id="wysiwyg-unorderedList"><svg width="60%" height="100%" fill="currentcolor" stroke="currentcolor" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg"><path class="path1" d="M384 1408q0 80-56 136t-136 56-136-56-56-136 56-136 136-56 136 56 56 136zm0-512q0 80-56 136t-136 56-136-56-56-136 56-136 136-56 136 56 56 136zm1408 416v192q0 13-9.5 22.5t-22.5 9.5h-1216q-13 0-22.5-9.5t-9.5-22.5v-192q0-13 9.5-22.5t22.5-9.5h1216q13 0 22.5 9.5t9.5 22.5zm-1408-928q0 80-56 136t-136 56-136-56-56-136 56-136 136-56 136 56 56 136zm1408 416v192q0 13-9.5 22.5t-22.5 9.5h-1216q-13 0-22.5-9.5t-9.5-22.5v-192q0-13 9.5-22.5t22.5-9.5h1216q13 0 22.5 9.5t9.5 22.5zm0-512v192q0 13-9.5 22.5t-22.5 9.5h-1216q-13 0-22.5-9.5t-9.5-22.5v-192q0-13 9.5-22.5t22.5-9.5h1216q13 0 22.5 9.5t9.5 22.5z"></path></svg></button>' +
                '<button class="wysiwygbutton" title="Add link" id="wysiwyg-link"><svg width="70%" height="100%" id="i-link" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="currentcolor" stroke-linecap="round" stroke-linejoin="round" stroke-width="6.25%">   <path d="M18 8 C18 8 24 2 27 5 30 8 29 12 24 16 19 20 16 21 14 17 M14 24 C14 24 8 30 5 27 2 24 3 20 8 16 13 12 16 11 18 15" /></svg></button>' +
                '<button class="wysiwygbutton" title="Clear formatting" id="wysiwyg-removeFormat">T<span style="vertical-align: sub; margin-left: -0.3rem">&#10005</span></button>' +
                '<div class="wysiwyglinkform" tabindex="1" hidden>' +
                    '<div><input id="wysiwygklinkurl" placeholder="LINK ADDRESS"></div>' +
                    '<div><input id="wysiwygklinktext" placeholder="(OPTIONAL) TEXT"></div>' +
                    '<button class="addlinkbutton"><svg id="i-checkmark" viewBox="0 0 32 32" width="100%" height="100%" fill="none" stroke="currentcolor" stroke-linecap="round" stroke-linejoin="round" stroke-width="6.25%"> <path d="M2 20 L12 28 30 4" /></svg></button>' +
                    // '<button class="addlinkbutton">&#10004;</button>' +
                '</div>' +
              '</div> ',
    link: (scope, elem, attrs, ngModel) => {
        let editorelement = elem.children()[0];
        let placeholderelement = elem.children()[1];
        let buttonselement = elem.children()[2];
        let eventListeners = new EventListeners();

        buttonselement.hidden = true;
        let buttons = {};
        for (let i=0; i<buttonselement.children.length-1; i++) {
            let button = buttonselement.children[i];
            let name = button.id.split('-')[1];
            eventListeners.add(button, "mousedown", function () {scope.vm.blurBlocked = true;});
            if (name !== "color" || name !== "link") {
                eventListeners.add(button, "mouseup", function () {editor.openPopup(); scope.vm.blurBlocked = false;});
            }
            buttons[name] = button;
        }

        placeholderelement.innerHTML = scope.placeholder || '';

        var options = {
            element: editorelement,
            onPlaceholder: placeholderEvent,
            onKeyDown: function( key, character, shiftKey, altKey, ctrlKey, metaKey ) {
                                if (ctrlKey || metaKey) {
                                    if (character.toLowerCase() === "b") {
                                        console.log("bold hotkey");
                                        editor.bold();
                                        return false;
                                    }
                                    else if (character.toLowerCase() === "i") {
                                        console.log("italic hotkey");
                                        editor.italic();
                                        return false;
                                    }
                                    else if (character.toLowerCase() === "u") {
                                        console.log("underline hotkey");
                                        editor.underline();
                                        return false;
                                    }

                                }
                        },
            onSelection: function( collapsed, rect, nodes, rightclick ) {
                            console.log("Is inside table: "+isInsideTable(nodes));
                            let colors = getCurrentColors(nodes);
                            if (colors["highlightcolors"].length == 1) {
                                buttons["highlightcolor"].children[1].style.color = colors["highlightcolors"][0];
                            } else {
                                buttons["highlightcolor"].children[1].style.color = 'rgb(0,0,0)';
                            }
                            if (colors["fontcolors"].length == 1) {
                                buttons["fontcolor"].children[0].style.color = colors["fontcolors"][0];
                            } else {
                                buttons["fontcolor"].children[0].style.color = 'rgb(0,0,0)';
                            }

                        },
        };

        var editor = wysiwyg(options);

        scope.$watch('ngDisabled', () => {
            editor.readOnly(scope.ngDisabled);
        });

        // Attach existing $viewValue to editor
        ngModel.$render = () => {
            if (typeof(ngModel.$viewValue) === 'string' &&
                ngModel.$viewValue !== '') {
                editor.setHTML(ngModel.$viewValue);
                placeholderelement.hidden = true;
            }
            else {
                editor.setHTML('');
                placeholderelement.hidden = false;
            }
        };

        // Update state on certain triggering events
        var setState = function() {
            scope.$evalAsync(ngModel.$setViewValue(editor.getHTML()))
        };

        eventListeners.add(editorelement, "input", () => {setTimeout(setState(), 0)});

        scope.$on('$destroy', function () {eventListeners.removeAll;});

        // Helper functions for editorelement
        function placeholderEvent(visible) {
            if (document.activeElement !== editorelement || !visible) {
                placeholderelement.hidden = !visible;
                editorelement.hidden = visible;
            }
        }

        function getTextFromHTML(html) {
            html = html.replace(/<\/?(br|ul|ol|strong|em|li|h1|h2|h3|h4|p|div)[^>]*>/g, '');
            html = html.replace('/s+/g', '');
            return html;
        }

        function blur() {
            if (!scope.vm.blurBlocked) {
                if (getTextFromHTML(editor.getHTML()) === "") {
                    editor.setHTML("");
                    placeholderEvent(true);
                }

                // Clean up html highlight color with no effect
                let html = editor.getHTML()
                html = html.replace(`background-color: rgb(${DEFAULT_COLOR.RGB});`, '');
                html = html.replace('style=""', '');
                editor.setHTML(html)
                closeLinkForm(true);
                buttonselement.hidden = true;
            }
        }

        function focus() {
            if (!editor.readOnly()) {
                placeholderEvent(false);
                editorelement.focus();
                buttonselement.hidden = false;
            }
        }

        // Add eventlisteners to editorelement and buttons
        eventListeners.add(editorelement, "blur", blur);
        eventListeners.add(editorelement, "focus", focus);
        eventListeners.add(placeholderelement, "click", focus);
        try {
            eventListeners.add(buttons["src"], "click", toggleSource);
        } catch(e) {}
        eventListeners.add(buttons["bold"], "click", editor.bold);
        eventListeners.add(buttons["italic"], "click", editor.italic);
        eventListeners.add(buttons["underline"], "click", editor.underline);
        eventListeners.add(buttons["monospace"], "click", () => {editor.fontName("monospace")});
        eventListeners.add(buttons["orderedList"], "click", () => {editor.insertList(true)});
        eventListeners.add(buttons["unorderedList"], "click", () => {editor.insertList(false)});
        eventListeners.add(buttons["heading1"], "click", () => {editor.format("h1")});
        eventListeners.add(buttons["heading2"], "click", () => {editor.format("h2")});
        eventListeners.add(buttons["paragraph"], "click", () => {editor.format("div")});
        eventListeners.add(buttons["removeFormat"], "click", editor.removeFormat);

        // Handle source mode
        scope.vm.sourcemode = false;
        scope.vm.source = "";
        function toggleSource() {
            var e = editor;

            if (scope.vm.sourcemode) {
                e.setHTML(scope.vm.source)
            } else {
                scope.vm.source = e.getHTML();
                e.setHTML(scope.vm.source.replace(/</g, "&lt;").replace(/>/g, "&gt;"))
            }
            e.readOnly(!scope.vm.sourcemode)
            scope.vm.sourcemode = !scope.vm.sourcemode;
            for (let btn in buttons) {
                if (btn !== "src") {
                    buttons[btn].disabled = e.readOnly();
                }
            }
        }

        let fontcolors = [
            '#000000', // black
            '#FF1C2B', // red
            '#23D801', // green
            '#0918A9', // blue
        ]

        let highlightcolors = [
            DEFAULT_COLOR.HEX,
            '#D90309', // red
            '#66FF33', // green
            '#FDFF16', // yellow
            '#0967F9', // blue
        ]

        // Add color picker
        let fontpicker = addColorPicker(buttons["fontcolor"], fontcolors);

        let highlightpicker = addColorPicker(buttons["highlightcolor"], highlightcolors);
        highlightpicker.on("pickerClosed", () => {editor.closePopup(); scope.vm.blurBlocked=false;});
        highlightpicker.on('colorChosen', function(color, targetElem) {editor.closePopup(); editor.highlight(color); editor.openPopup();});
        fontpicker.on("pickerClosed", () => {editor.closePopup(); scope.vm.blurBlocked=false;});
        fontpicker.on('colorChosen', function(color, targetElem) {editor.closePopup(); editor.forecolor(color); editor.openPopup();});

        // Debug colors (remember to comment out editor.setHTML('') further up)
        // let html = "";
        // for (let i=0; i<highlightcolors.length; i++) {
        //     for (let j=0; j<fontcolors.length; j++) {
        //         html += `<div></div><font color=${fontcolors[j]} style="background-color: ${highlightcolors[i]};"> Sample ${i},${j}</font></div>`
        //         // <font color="#ff1c0b" style="background-color: rgb(9, 169, 92);">dgdsghdfshdfhdfhdf</font>
        //
        //     }
        // }
        // editor.setHTML(html);
        // console.log(editor.getHTML())


        // Add eventhandlers on link-form
        eventListeners.add(buttons["link"], "click", handleLinkForm);
        var linkform = buttonselement.children[buttonselement.children.length-1];
        eventListeners.add(linkform, "blur", () => {setTimeout(closeLinkForm, 1, false)}); // Close if active element not in link form)
        let linkinputs = linkform.getElementsByTagName("input");
        let addbutton = linkform.getElementsByTagName("button")[0];
        eventListeners.add(addbutton, "click", addLink);
        for (let i=0; i<linkinputs.length; i++) {
            eventListeners.add(linkinputs[i], "blur", () => {setTimeout(closeLinkForm, 1, false)}); // Close if active element not in link form
            eventListeners.add(linkinputs[i], "keyup", handleLinkForm); // Only handles esc and enter
        }

        // Handle link form
        function handleLinkForm(e) {
            let src = e.target || e.srcElement;
            console.log(src);

            if (src.nodeName !== "INPUT" && (src === buttons["link"] || buttons["link"].contains(src))) {
                // Open or close link form
                if (linkform.hidden) {
                    editor.openPopup(); // Save selection, to later add link at right location
                    // Compute position
                    let top = buttons["link"].offsetTop;
                    let height = buttons["link"].offsetHeight;
                    let left = buttons["link"].offsetLeft;
                    linkform.style.left = left+"px";
                    linkform.style.top = (top+height)+"px";

                    linkform.hidden = false;
                } else {
                    console.log("Closing link form")
                    closeLinkForm(true)
                }

            } else if (src.nodeName === "INPUT") {
                if (typeof e.type === "click") {
                    src.focus()
                } else if (e.type === "keyup") {
                    if (e.key === "Escape") {
                        closeLinkForm(true)
                    } else if (e.key === "Enter") {
                        addLink()
                    }
                }
            }
        }

        function addLink() {
            // Get url
            let url = linkform.children[0].children[0].value;

            if (url.replace(/\s+/g, '') === "") {
                // Empty url
                closeLinkForm(true);
                return;
            }
            if (!url.startsWith("http")) { // Should start with either http or https
                url = "http://"+url;
            }

            // Get link text
            let linktext = linkform.children[1].children[0].value;
            linktext = linktext !== "" ? linktext: url;

            // Insert link
            editor.insertHTML('<div><a href="'+url+'" target="'+url+'"><span>'+linktext+'</span></a></div>');
            closeLinkForm(true)
        }

        function closeLinkForm(force) {
            // if (!force && buttons["link"].contains(document.activeElement)) {
            if (!force && linkform.contains(document.activeElement)) {
                // Link form is still active
                return;
            }
            linkform.hidden = true;

            // Clear inputs
            let inputs = linkform.getElementsByTagName("input");
            for (let i=0; i<inputs.length; i++) {
                inputs[i].value = "";
            }

            editor.closePopup().collapseSelection();
            scope.vm.blurBlocked = false;
        }
    }
})

export class WysiwygEditorController {}

