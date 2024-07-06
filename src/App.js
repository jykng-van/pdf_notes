import { useState, useRef, useEffect } from 'react';
import PdfPreviewer from './PdfPreviewer.js';

import parse from 'html-react-parser';
import DOMPurify from 'dompurify';

import Quill from 'quill/core';
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
import Snow from "quill/themes/snow";
import Toolbar from "quill/modules/toolbar";
import Bold from "quill/formats/bold";
import Italic from "quill/formats/italic";
import List from "quill/formats/list";
import Link from "quill/formats/link";

function App() {
  const fileInput = useRef(null); //the hidden file input for adding the pdf
  const preview = useRef(null); //the canvas used for pdf preview
  const pdfview = useRef(); //the PdfPreviewer object
  const dialog = useRef(null); //dialog for pdfview
  const pageNumber = useRef(null); //the number input for PDF page
  const noteTextBox = useRef(null); //the textbox for notes
  const noteDialog = useRef(null); //the dialog for notes in preview mode
  const quill = useRef(); //the Quill of textbox

  const [currentPage, setCurrentPage] = useState(1); //current page number of the pdf
  const [totalPages, setTotalPages] = useState(1); //total pages of the pdf
  const [noteData, setNoteData] = useState([]); //array of objects {note, thumb} of pdf data
  const [pdfFile, setPdfFile] = useState(null); //the data url of the pdf
  const [mode, setMode] = useState('edit'); //the mode edit|preview for viewing
  const [currentNote, setCurrentNote] = useState('');

  let save_timeout;

  function dragover(e){
    e.preventDefault();
  }
  function drop(e){
    e.preventDefault();
    if (e.dataTransfer.items && e.dataTransfer.items[0].kind === 'file'){
        // Use DataTransferItemList interface to access the file(s)
        let file = e.dataTransfer.items[0].getAsFile();
        console.log(file);

        if (file.type === 'application/pdf'){
            read_drop_pdf(file);
        }
    }
  }
  function read_drop_pdf(file){
    console.log('drop pdf', file);
    const reader = new FileReader();
    reader.addEventListener("load", set_pdf_data, false);
    reader.readAsArrayBuffer(file);
  }
  function set_pdf(e){
    console.log('set_pdf', e.target.files);
    const file = e.target.files[0];
    console.log(file);
    if (file && file.type==='application/pdf'){
        const reader = new FileReader();

        reader.addEventListener("load", set_pdf_data, false);
        if (file) {
            reader.readAsArrayBuffer(file);
        }
    }
  }
  async function set_pdf_data(e){
    dialog.current.showModal();
    let pdf_data = e.target.result; //data url
    setPdfFile(pdf_data);
    await pdfview.current.load_new_pdf(pdf_data);
    console.log('total pages', pdfview.current.total_pages);
    let total = pdfview.current.total_pages;
    setTotalPages(total);
    setNoteData([...Array(total)]);
  }
  function edit_pdf(){
    setMode('edit');
    pdfview.current.jump_to_page(1);
    get_page(1);
    dialog.current.showModal();
  }

  //page controls
  function prev_page(){
    pdfview.current.prev_page();
    get_page(pdfview.current.page_num);
  }
  function next_page(){
    pdfview.current.next_page();
    get_page(pdfview.current.page_num);
  }
  function jump_to_page(){
    pdfview.current.jump_to_page(pageNumber.current.value);
    get_page(pdfview.current.page_num);
  }
  function get_page(num){
    console.log('get_page',num,mode);
    setCurrentPage(num);
    let index = num-1;

    if (mode==='edit'){
      //load note data for page
      if (noteData[index]!=null){
        let converted = quill.current.clipboard.convert({html:noteData[index].note});
        quill.current.setContents(converted);
      }else{
        quill.current.setContents('');
      }
    }
  }

  function close_dialog(){
    dialog.current.close();
  }
  function zoom_in(){
    pdfview.current.page_zoom_in();
  }
  function zoom_out(){
    pdfview.current.page_zoom_out();
  }
  //save note to page
  function save_notes(){
    let page_index = parseInt(currentPage) - 1;

    //save notes and thumbnails
    let saved_note = quill.current.getSemanticHTML();
    let saved_thumb = pdfview.current.export_page();
    console.log(page_index, saved_note);
    let updated = noteData.map((n,i)=>{
      if (i===page_index) return {
        note:saved_note,
        thumb:saved_thumb
      };
      else return n;
    });
    console.log(updated);
    setNoteData(updated);
    //save indicator
    let message = document.querySelector('#save-message');
    message.classList.add('show');
    clearTimeout(save_timeout);
    save_timeout = setTimeout(()=>{
      message.style.setProperty('opacity',0);
    },2000);
    message.addEventListener('transitionend',()=>{
      message.classList.remove('show');
      message.style.setProperty('opacity',1);
    },{once:true});
  }

  //open pdf page with note
  function open_pdf_page(index){
    setMode('preview', index+1);
    dialog.current.showModal();
    pdfview.current.jump_to_page(index+1);
    get_page(index+1);
  }
  function close_note_dialog(){
    noteDialog.current.close();
  }
  useEffect(()=>{
    console.log('setPreviewNote', currentPage, mode);
    if (mode==='preview' && noteData[currentPage-1]!=null){
      noteDialog.current.showModal();
      setCurrentNote(noteData[currentPage-1].note);
    }

  },[mode,currentPage, noteData]);

  //initialize PDF preview
  useEffect(()=>{
    if (pdfview.current == null){
      pdfview.current = new PdfPreviewer(preview.current);
    }
  },[pdfview]);

  //intialize PDF notes
  useEffect(()=>{
    if(quill.current == null){
        console.log('setup quill');
        //notes
        Quill.register({
            "modules/toolbar": Toolbar,
            "themes/snow": Snow,
            "formats/bold": Bold,
            "formats/italic": Italic,
            "formats/list": List,
            "formats/link": Link,
        });
        quill.current = new Quill(noteTextBox.current,{
            theme: 'snow',
            modules:{
                toolbar:[
                    ['bold','italic'],
                    ['link'],
                    [{'list':'ordered'},{'list':'bullet'}]
                ]
            }
        });
    }
  },[noteTextBox]);
//
  return (
    <>
      { !pdfFile ? (
        <section>
          <div id="drop-zone" onDragOver={dragover} onDrop={drop}>
            <strong>Drag and Drop PDF Here<br />
            or</strong>
            <label className="select-button" htmlFor="pdf-file">Select PDF</label>
          </div>
          <input type="file" id="pdf-file" ref={fileInput} accept="application/pdf" onChange={set_pdf} />
        </section>
      ) : (
        <section>
          <div id="edit-section">
            <button id="edit-button" onClick={edit_pdf}>Edit PDF</button>
          </div>
          <div id="notes-added">
            {noteData.map((data, index)=>{
              if(data && data.note){ return (<div key={index}>
                <img src={data.thumb} alt={'Page '+ (index+1)} title={'Page '+ (index+1)} onClick={()=>open_pdf_page(index)} />
              </div>)
              }else{
                return null;
              }
            })}
          </div>
        </section>
      )
      }

      <dialog id="pdf-dialog" ref={dialog}>
        <section className="content">
          <header>
            <h2>{mode === 'edit' ? 'Edit PDF' : 'Preview PDF Note'}</h2>
            <button onClick={zoom_out}>-</button>
            <button onClick={zoom_in}>+</button>
          </header>
          <div id="preview-holder">
            <canvas id="pdf-preview" ref={preview}></canvas>
          </div>
          <div id="text-editor" style={{display : mode==='edit' ? 'block' : 'none'}}>
            <div id="notes" ref={noteTextBox}></div>
          </div>
          <div id="pdf-controls">
            <button onClick={close_dialog}>Close PDF</button>
            <button style={{display : mode==='edit' ? 'inline-block' : 'none'}} onClick={save_notes}>Save Notes</button>
            <button id="prev" onClick={prev_page} disabled={currentPage===1} title="Previous">&lt;</button>
            <input type="number" onChange={jump_to_page} ref={pageNumber} value={currentPage} min={1} max={totalPages} title="Page" />
            <span>of {totalPages}</span>
            <button id="next" onClick={next_page}  disabled={currentPage===totalPages} title="Next">&gt;</button>
            <div id="save-message">Note Saved</div>
          </div>
        </section>
      </dialog>

      <dialog id="note-message" ref={noteDialog}>
        <div>
          {currentNote && (
            <section>{parse(DOMPurify.sanitize(currentNote))}</section>
          )}
          <button onClick={close_note_dialog}>Close</button>
        </div>
      </dialog>
    </>
  );
}

export default App;
