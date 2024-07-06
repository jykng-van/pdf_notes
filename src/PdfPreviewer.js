import * as pdfjs from 'pdfjs-dist';

export default class PdfPreviewer {
    previewer; //the canvas the preview displays on
    frame; //the parent element of canvas which should be position relative and overflow hidden
    context; //the canvas context

    pdf; //the pdf file
    page_num; //the current page number
    total_pages; //the total pages of the pdf

    scale; //the zoom level
    zoomlevels = [.25, .50, .75, 1.0, 1.5, 2.0]; //allowable zoom levels

    mouse_engaged; //if the mouse (or touch) is in use
    start_x; //starting x position
    start_y; //starting y position
    pdf_pos = {
        start_x: null,
        start_y: null,
        x: null,
        y: null,
        width: null,
        height:null,
    }; //pdf positioning info

    thumb_max = 90; //max dimension of thumbnail

    constructor(previewer) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString(); //setup the worker

        this.previewer = previewer;
        this.frame = this.previewer.parentNode;
        this.context = this.previewer.getContext("2d");

        this.page_num = 1;
        this.scale = 1.0;

        this.mouse_engaged = false;
        this.start_x = null;
        this.start_y = null;

        //zoom control
        ['mousedown','touchstart'].forEach(e => this.previewer.addEventListener(e, this.mouse_down.bind(this)));
        ['mouseup','touchend'].forEach(e => window.addEventListener(e, this.mouse_up.bind(this)));
        ['mousemove','touchmove'].forEach(e => this.previewer.addEventListener(e, this.mouse_move.bind(this)));

        window.addEventListener('resize', this.load_pdf_page.bind(this));
    }
    async load_new_pdf(new_file) {
        this.file = new_file;
        this.page_num = 1;
        this.scale = 1.0;
        try {
            this.loadingTask = pdfjs.getDocument(this.file);
            await this.load_pdf();
        } catch (ex) {
            console.log(ex.message);
        }
    }

    async load_pdf_info(file) {
        try {
            let pdf = await pdfjs.getDocument(`/Api/RetrievePDF/${file}`).promise;
            return pdf._pdfInfo;
        } catch (ex) {
            console.log(ex.message);
        }
    }
    async load_pdf() {
        try {
            this.pdf = await this.loadingTask.promise;
            console.log(this.pdf);
            this.total_pages = await this.pdf._pdfInfo.numPages;
            console.log('load_pdf total_pages', this.total_pages);

            if (this.full_speaker_notes) {
                this.json_notes = this.json_notes.filter(p => p.page <= this.total_pages);
                console.log(this.json_notes);
                this.full_speaker_notes.value = JSON.stringify(this.json_notes);
            }


            await this.load_pdf_page();
        } catch (e) {
            console.log(e.message);
        }
    }
    async load_pdf_page() {
        try {
            let page = await this.pdf.getPage(this.page_num);

            let scale = this.scale;
            const viewport = page.getViewport({ scale });
            console.log(viewport);

            this.previewer.width = viewport.width;
            this.previewer.height = viewport.height;
            this.pdf_pos.width = viewport.width;
            this.pdf_pos.height = viewport.height;

            let translateX = (this.frame.offsetWidth - viewport.width) / 2;
            let translateY = (this.frame.offsetHeight - viewport.height) / 2;

            this.pdf_pos.x = translateX;
            this.pdf_pos.y = translateY;
            console.log(this.pdf_pos);
            this.position_pdf();

            const transform = [1, 0, 0, 1, 0, 0];

            //
            // Render PDF page into canvas context
            //
            const renderContext = {
                canvasContext: this.context,
                transform,
                viewport,
                /*background: 'rgba(255,255,255,.2)',
                pageColors: '#fff'*/
            };

            page.render(renderContext);
        } catch (ex) {
            console.log(ex.message);
        }
    }
    position_pdf() {
        this.previewer.style.left = `${this.pdf_pos.x}px`;
        this.previewer.style.top = `${this.pdf_pos.y}px`;
    }
    next_page(){
        if (this.page_num < this.total_pages) {
            this.page_num++;
            this.load_pdf_page();
        }
    }
    prev_page() {
        if (this.page_num > 1) {
            this.page_num--;
            this.load_pdf_page();
        }
    }
    jump_to_page(val) {
        if (val < 1) {
            this.page_num = 1;
        } else if (val > this.total_pages) {
            this.page_num = this.total_pages;
        } else {
            this.page_num = parseInt(val);
        }
        this.load_pdf_page();
    }
    page_zoom_out() {
        let index = this.zoomlevels.indexOf(this.scale);
        if (index > 0) {
            this.scale = this.zoomlevels[index - 1];
        }
        this.load_pdf_page();
    }
    page_zoom_in() {
        let index = this.zoomlevels.indexOf(this.scale);
        if (index < this.zoomlevels.length-1) {
            this.scale = this.zoomlevels[index + 1];
        }
        this.load_pdf_page();
    }
    mouse_down(e) {
        if (e.touches){ //touch
            let canvasbox = this.previewer.getBoundingClientRect();
            this.start_x = e.touches[0].clientX - canvasbox.left;
            this.start_y = e.touches[0].clientY - canvasbox.top;
        }else{ //mouse
            this.start_x = e.offsetX;
            this.start_y = e.offsetY;
        }
        this.start_x += e.target.offsetLeft;
        this.start_y += e.target.offsetTop;

        this.mouse_engaged = true;
        console.log('mouse_down', this.start_x, this.start_y, 'pdf_pos', this.pdf_pos.x, this.pdf_pos.y);

        this.pdf_pos.start_x = this.pdf_pos.x;
        this.pdf_pos.start_y = this.pdf_pos.y;
    }
    mouse_up() {
        this.mouse_engaged = false;
    }
    mouse_move(e) {
        let current_x, current_y;
        if (e.touches){ //touch
            let canvasbox = this.previewer.getBoundingClientRect();
            current_x = e.touches[0].clientX - canvasbox.left;
            current_y = e.touches[0].clientY - canvasbox.top;
        }else{ //mouse
            current_x = e.offsetX;
            current_y = e.offsetY;
        }
        current_x += e.target.offsetLeft;
        current_y += e.target.offsetTop;

        let change_x = current_x - this.start_x;
        let change_y = current_y - this.start_y;
        let current = this.pdf_pos;
        if (this.mouse_engaged) {
            console.log(e.target, current_x, current_y, change_x, change_y);

            //bounds check
            let x_pos = current.start_x + change_x;
            let y_pos = current.start_y + change_y;

            current.x = this.check_x_bounds(x_pos);
            current.y = this.check_y_bounds(y_pos);
            this.position_pdf();
        }
    }
    check_x_bounds(x_pos) {
        let current = this.pdf_pos;
        let frame_width = this.frame.offsetWidth;
        if (current.width <= frame_width) { //image is smaller than canvas
            if (x_pos < 0) { //leftside
                x_pos = 0;
            } else if (x_pos + current.width > frame_width) {//rightside
                x_pos = frame_width - current.width;
            }
        } else { //image is larger than canvas
            if (x_pos + current.width < frame_width) {
                x_pos = frame_width - current.width; //leftside
            } else if (x_pos > 0) {
                x_pos = 0; //rightside
            }
        }
        return x_pos;
    }
    check_y_bounds(y_pos) {
        let current = this.pdf_pos;
        let frame_height = this.frame.offsetHeight;
        if (current.height <= frame_height) { //image is smaller than canvas
            if (y_pos < 0) { //topside
                y_pos = 0;
            } else if (y_pos + current.height > frame_height) {//bottomside
                y_pos = frame_height - current.height;
            }
        } else { //image is larger than canvas
            if (y_pos + current.height < frame_height) {
                y_pos = frame_height - current.height; //topside
            } else if (y_pos > 0) {
                y_pos = 0; //bottomside
            }
        }
        return y_pos;
    }
    //create a thumbnail from current page
    export_page() {
        //create new canvas
        let ncanvas = document.createElement('canvas');
        if (this.previewer.width > this.previewer.height){
            ncanvas.width = this.thumb_max;
            ncanvas.height = this.thumb_max * (this.previewer.height / this.previewer.width);
        }else{
            ncanvas.height = this.thumb_max;
            ncanvas.width = this.thumb_max * (this.previewer.width / this.previewer.height);
        }
        console.log(ncanvas.width, ncanvas.height);

        let ctx = ncanvas.getContext('2d');
        ctx.drawImage(this.previewer, 0, 0, this.previewer.width, this.previewer.height,
            0, 0, ncanvas.width, ncanvas.height);
        let img_url = ncanvas.toDataURL('image/jpeg');
        return img_url;
    }
}


