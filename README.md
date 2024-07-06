# PDF Previewer and Notes <br>
This was originally in a project that used "speaker notes" for a PDF, it didn't change the PDF, it just had associated data with a page in the PDF with an optional note that would appear if clicked. <br>

It uses Mozilla's *PDF.js* library and a rich text editor. <br>

Since this is not a separate editor and display page like the project it was originally for, there's instead an "edit" and "preview" mode. It's designed to only edit one PDF and there's an addition of a preview page gallery. <br>

## The PDF Viewer <br>
There's some limited zoom levels for the PDF preview and it can be moved around, this exists in both modes. <br>

Pages can be changed with the "previous" and "next" buttons below, or with the "current page" input. <br>

The old project wasn't touchscreen friendly, this version is. <br>

## Edit Mode <br>
A PDF is selected to edit, the old project had logic for checking against an old PDF which was removed, since this app is only concerned about the first PDF to edit. <br>

The notes are added in the text box at the bottom, the old project used *SCeditor* which I didn't find that compatible with the app so I used *Quill.js* instead. <br>

Notes are only added/changed on clicking **Save Notes** with a timed indicator to appear. Pages with saved notes appear in the preview gallery below, where clicking on one activates "preview" mode.<br>

After a PDF has been selected, the drop area no longer appears and there's an Edit button in it's place, which will set "edit" mode and reopen the previewer when clicked. <br>

## Preview Mode <br>
In the old project notes appeared optionally, for this demo app they appear as a dialog message if there's notes for that page. <br>