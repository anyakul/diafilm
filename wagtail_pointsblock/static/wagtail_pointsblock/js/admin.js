/* global jQuery, imageChoosers */
(function ($){
    'use strict';
    const markerSelector = 'input[name$=type][value=points]';

    function uuid4() {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    }

    function PointCanvas(field){
        const titleSelector = 'input[id$=value-text]';
        const coordsSelector = 'input[id$=value-coords]';
        const initializedClass = 'js-points-inited';
        const deletedClass = 'js-points-deleted';
        // const containerSelector = 'div[data-streamfield-stream-container]';
        const containerSelector = 'div[class~=c-sf-block]';
        const gap = [5, 5];

        const self = this;
        self.id = uuid4();

        function getId(value) {
            const parts = value.split("-");
            return parts[1] + "-" + parts[5];
        }

        function getCoords(value) {
            return value.replaceAll("%", "").split(",")
        }

        function getRelativeCoords(element) {
            let top = Math.round(((element.offsetTop + gap[0]) / self.canvas.clientHeight) * 100);
            let left = Math.round(((element.offsetLeft + gap[1]) / self.canvas.clientWidth) * 100);

            top = (top > 100) ? 100 : (top < 0) ? 0 : top;
            left = (left > 100) ? 100 : (left < 0) ? 0 : left;

            return [left, top];
        }

        function getPoint(key){
            let point;
            if(key instanceof Element || key instanceof HTMLDocument){
                point = getPointByContainer(key);
            }
            else {
                point = getPointById(key);
            }

            return point;
        }

        function getPointById(id) {
            return self.points[id];
        }

        function getPointByContainer(element) {
            const point = Object.values(self.points).filter(item => item.container === element);
            if(point.length){
                return point[0];
            }
        }

        /** methods **/
        self.init = function (){
            self.points = {};
            self.pointsByContainer = {};
            self.canvas = field.getElementsByClassName("preview-image")[0];
            self.canvas.classList.add("preview-image__points");
            self.container = field.querySelectorAll(containerSelector)[0];

            self.collectPoints();

            // on add point with + (bind on react BaseSequenceBlock and telepath/blocks.js)
            self.container.addEventListener("click", function(e){

                if(e.target.classList.contains("action-add-block-point")) {
                    self.collectPoints();
                }
            })

            // initialized
            field.classList.add("js-init-points");

            return self;
        };

        self.collectPoints = function() {
            /**
             *
             * @type {Set<string>}
             */
            // Query all points and add them to key-value
            let availablePoints = new Set(Object.keys(self.points));

            const points = self.container.querySelectorAll(containerSelector);
            Array.from(points).map(item => {
                if(item.classList.contains(deletedClass)){
                    // do nothing
                }
                else if(item.classList.contains(initializedClass)) {
                    const point = getPoint(item);
                    availablePoints.delete(point.id);
                }
                else{
                    self.addPoint(item);
                }
            });

            Array.from(availablePoints).map(id => self.removePoint(id));
        }

        self.addPoint = function(element) {
            /**
             *
             * @type {HTMLDivElement}
             */
            const dot = document.createElement("div");
            self.canvas.appendChild(dot);

            const buttons = element.querySelectorAll("button[class=c-sf-block__actions__single]")

            // element
                // .querySelector("button[title=Delete]")
            buttons[buttons.length - 1]
                .addEventListener("click", function(e){
                    self.removePoint(e.target.closest(containerSelector));
                });

            // element
            //     .querySelector("button[title=Duplicate]")
            buttons[buttons.length - 2]
                .addEventListener("click", function(e){
                    self.collectPoints();
                    // wrong
                    // self.addPoint(e.target.closest(containerSelector));
                });

            const coordsInput = element.querySelectorAll(coordsSelector)[0];
            // point position on coords input change
            coordsInput.addEventListener("change", self.onPointCoordsUpdate);

            // get point id
            const id = getId(coordsInput.id);

            const titleInput = element.querySelectorAll(titleSelector)[0];
            // point title on title input change
            titleInput.addEventListener("change", self.onPointTitleUpdate);
            const point = {
                "id": id,
                "container": element,
                "coordsInput": coordsInput,
                "coords": getCoords(coordsInput.value),
                "titleInput": titleInput,
                "dot": dot,
            }

            dot.style.left = point.coords[0] + "%";
            dot.style.top = point.coords[1] + "%";
            dot.setAttribute("title", titleInput.value);

            $(dot).draggable({
                containment: self.canvas,
                scroll: false,
                cursor: "move",
                stop: function() {
                    const relativeCoords = getRelativeCoords(dot);
                    coordsInput.value = relativeCoords.join(",");
                }
            });

            self.points[id] = point;
            self.pointsByContainer[element] = id;
            element.classList.add(initializedClass);
        };

        self.removePoint = function(key) {
            const point = getPoint(key);
            if(!point.container.classList.contains(deletedClass)) {
                point.dot.remove();
                point.container.classList.add(deletedClass);
                delete self.points[point.id];
            }
        }

        self.onPointCoordsUpdate = function(e) {
            const element = e.target.closest(containerSelector);
            const point = getPoint(element);

            point.coords = getCoords(e.target.value);
            point.dot.style.left = point.coords[0] + "%";
            point.dot.style.top = point.coords[1] + "%";
        }

        self.onPointTitleUpdate = function(e) {
            const element = e.target.closest(containerSelector);
            const point = getPoint(element);

            point.dot.setAttribute("title", e.target.value);
        }

        return self.init();
    }

    $(function (){
        // Навесим на уже существующие
        const markers = document.querySelectorAll(markerSelector);
        markers.length && Array.from(markers).map(item => {
            new PointCanvas(item.parentElement);
        });
    });
}(jQuery));
