let ELEMENT = function(renderer, data, index, selectedIndices){
    this.renderer = renderer;
    this.data = data;
    this.index = index;
    this.selected = this.setSelected(selectedIndices);
    this.init();
};
let RENDERER = {
    PADDING: 0.05,

    init: function (categoryData, elementData) {
        this.setParameters(categoryData);
        this.reconstructMethods();
        this.adjustContainer();
        this.createElements(elementData);
        this.bindEvent();
        this.render();
    },
    setParameters: function (categoryData) {
        this.categoryData = categoryData;
        this.$window = $(window);
        this.$container = $('#jsi-elements-container');
        this.$categoryContainer = $('#jsi-category-container');
        this.$categoryWrapper = this.$categoryContainer.parent();
        this.$categories = this.$categoryContainer.find('a');
        this.$tipContainer = $('#jsi-tooltip-container');
        this.$tipCategories = this.$tipContainer.find('.jsc-tip-category');
        this.$tipContents = this.$tipContainer.find('.jsc-tip-contents-model');
        this.width = this.$container.width();
        this.height = this.$container.height();
        this.$canvas = $('<canvas />');
        this.context = this.$canvas.attr({
            width: this.width,
            height: this.height
        }).appendTo(this.$container).get(0).getContext('2d');
        this.selectedIndices = this.$categories.filter('.selected').map(function () {
            return parseInt($(this).attr('href'));
        });
        this.animationCount = 0;
        this.elements = [];
    },
    adjustContainer: function () {
        this.width = this.$container.width();
        this.height = this.$container.height();
        this.elementWidth = this.width * (1 - this.PADDING * 2) / 8;
        this.elementWidth += this.elementWidth / 8;
        this.elementHeight = this.elementWidth / 4;

        let fontSize = 20 * this.width / 1200;

        if (this.elementHeight * 14.5 > this.height * (1 - this.PADDING * 2)) {
            this.elementHeight = this.height * (1 - this.PADDING * 2) / 14.5;
            fontSize = 20 * this.height / 600;
        }
        this.font = '400 ' + fontSize + 'px monospace';

        this.$canvas.attr({width: this.width, height: this.height});
        this.$categoryWrapper.css('overflow-y', (this.$categoryContainer.height() > this.$categoryWrapper.height() ? 'scroll' : 'hidden'));

        let distance = Math.sqrt(Math.pow(this.width, 2) + Math.pow(this.height, 2));
        this.gradient = this.context.createRadialGradient(this.width / 2, this.height / 2, 0, this.width / 2, this.height / 2, distance);
        this.gradient.addColorStop(0, 'hsl(44, 100%, 89%)');
        this.gradient.addColorStop(1, 'hsl(44, 100%, 89%)');
        for (let i = 0, length = this.elements.length; i < length; i++) {
            this.elements[i].init();
        }
    },
    createElements: function (elementData) {
        for (let i = 0, length = elementData.length; i < length; i++) {
            this.elements.push(new ELEMENT(this, elementData[i], i, this.selectedIndices));
        }
    },
    reconstructMethods: function () {
        this.render = this.render.bind(this);
    },
    bindEvent: function () {
        let myself = this;

        this.$categories.each(function (index) {
            let $self = $(this);

            $self.on('click', myself.selectCategory.bind(myself, index));
        });
        this.$window.on('resize', this.adjustContainer.bind(this));
        this.$container.on('mouseleave mouseenter mousemove', this.checkMousePosition.bind(this));
    },
    selectCategory: function (index, event) {
        event.preventDefault();

        if (this.$categories.eq(index).hasClass('selected')) {
            this.$categories.eq(index).removeClass('selected');

            for (let i = 0, length = this.selectedIndices.length; i < length; i++) {
                if (this.selectedIndices[i] === index + 1) {
                    this.selectedIndices.splice(i, 1);
                    break;
                }
            }
        } else {
            this.$categories.eq(index).addClass('selected');
            this.selectedIndices.push(index + 1);
        }
        for (let i = 0, length = this.elements.length; i < length; i++) {
            this.elements[i].transform(this.selectedIndices);
        }
    },
    checkMousePosition: function (event) {
        let containerOffset = this.$container.offset(),
            x = event.clientX - containerOffset.left + this.$window.scrollLeft(),
            y = event.clientY - containerOffset.top + this.$window.scrollTop();

        for (let i = 0, length = this.elements.length; i < length; i++) {
            this.elements[i].checkMousePosition(x, y);
        }
    },
    showToolTip: function (data, axis) {
        this.context.fillStyle = 'hsla(-360deg, 0%, 0%, 56%)';
        this.context.fillRect(0, 0, this.width, this.height);

        this.$tipContainer.show();
        this.$tipCategories.hide();
        this.$tipContents.hide();

        for (let i = 0, length = data.categories.length; i < length; i++) {
            this.$tipCategories.eq(i).text(this.categoryData[data.categories[i]]).show();
        }
        if (data.categories.length === 0) {
            this.$tipCategories.eq(0).text('none').show();
        }
        let index = 0;

        for (let i = 0, length = data.contents.categories.length; i < length; i++) {
            this.$tipContents.eq(index++).text(this.categoryData[data.contents.categories[i]]).show();
        }
        for (let i = 0, length = data.contents.tags.length; i < length; i++) {
            this.$tipContents.eq(index++).text('<' + data.contents.tags[i] + '>').show();
        }
        if (index === 0) {
            this.$tipContents.eq(0).text('none').show();
        }
        let tipWidth = this.$tipContainer.outerWidth(),
            tipHeight = this.$tipContainer.outerHeight(),
            left = (axis.x <= this.width / 2) ? (axis.x + this.elementWidth + this.width / 40) : (axis.x - this.elementWidth - this.width / 40 - tipWidth),
            top = (axis.y <= this.height / 2) ? (axis.y + this.elementHeight + this.height / 80) : (axis.y - this.elementHeight - this.height / 80 - tipHeight);

        if (left < 10) {
            left = 10;
        } else if (left + tipWidth > this.width - 10) {
            left = this.width - tipWidth - 10;
        }
        if (top < 10) {
            top = 10;
        } else if (top + tipHeight > this.height - 10) {
            top = this.height - tipHeight - 10;
        }
        this.context.lineWidth = 1;
        this.context.strokeStyle = '#FFFFFF';
        this.context.beginPath();

        this.context.moveTo(axis.x + this.elementWidth / 2 * ((axis.x <= this.width / 2) ? 1 : -1), axis.y);
        this.context.lineTo(
            left + ((axis.x <= this.width / 2) ? 0 : tipWidth),
            top + ((axis.y <= this.height / 2) ? 0 : tipHeight)
        );
        this.context.stroke();

        this.$tipContainer.css({left: left, top: top});
    },
    render: function () {
        requestAnimationFrame(this.render);

        this.$tipContainer.hide();

        this.context.fillStyle = this.gradient;
        this.context.fillRect(0, 0, this.width, this.height);

        this.elements.sort(function (element1, element2) {
            if (element2.z - element1.z > 0) {
                return 1;
            } else if (element2.z - element1.z < 0) {
                return -1;
            } else {
                return element1.hovered ? 1 : -1;
            }
        });
        this.context.font = this.font;
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';

        for (let i = 0, length = this.elements.length; i < length; i++) {
            this.elements[i].render(this.context);
        }
    }
};
ELEMENT.prototype = {
    FOCUS_POSITION : 300,
    FAR_LIMIT : 600,
    ANIMATION_COUNT : 30,

    init : function(){
        this.x = this.renderer.width * this.renderer.PADDING + this.renderer.elementWidth / 2 + (this.index % 8) * this.renderer.elementWidth * 7 / 8 - this.renderer.width / 2;
        this.y = -this.renderer.elementHeight / 2 - Math.floor(this.index / 8) * this.renderer.elementHeight - ((this.index % 8 % 2 === 0) ? 0 : this.renderer.elementHeight / 2) - (this.renderer.height - this.renderer.elementHeight * 14.5) / 2 + this.renderer.height / 2;
        this.z = this.z0 = this.selected ? 0 : this.FAR_LIMIT;
        this.animationCount = -1;
        this.hovered = false;
    },
    setSelected : function(selectedIndices){
        for(let i = 0, lengthi = selectedIndices.length; i < lengthi; i++){
            let matched = false;

            for(let j = 0, lengthj = this.data.categories.length; j < lengthj; j++){
                if(selectedIndices[i] === this.data.categories[j]){
                    matched = true;
                    break;
                }
            }
            if(!matched){
                return false;
            }
        }
        return true;
    },
    getRandomValue : function(min, max){
        return min + (max - min) * Math.random();
    },
    transform : function(selectedIndices){
        let selected = this.setSelected(selectedIndices);

        if(this.selected === selected){
            return;
        }
        this.selected = selected;
        this.animationCount = this.ANIMATION_COUNT;
        this.z0 = this.z;
    },
    ease : function(t){
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
    checkMousePosition : function(x, y){
        if(this.z > 0){
            return;
        }
        this.hovered = false;

        let axis = this.getAxis(),
            width = this.renderer.elementWidth,
            height = this.renderer.elementHeight,
            rate = height / width * 4;

        if(x < axis.x - width / 2 || x > axis.x + width / 2
            || y < axis.y - height / 2 || y > axis.y + height / 2){
            return;
        }
        if(x <= axis.x){
            if(Math.abs((y - axis.y) / (x - (axis.x - width / 2))) > rate){
                return;
            }
        }else{
            if(x > axis.x && Math.abs((y - axis.y) / (x - (axis.x + width / 2))) > rate){
                return;
            }
        }
        this.hovered = true;
    },
    getAxis : function(){
        let rate = this.FOCUS_POSITION / (this.z + this.FOCUS_POSITION),
            x = this.renderer.width / 2 + this.x * rate,
            y = this.renderer.height / 2 - this.y * rate;

        return {rate : rate, x : x, y : y};
    },
    render : function(context){
        let axis = this.getAxis(),
            width = this.renderer.elementWidth,
            height = this.renderer.elementHeight,
            gradient = context.createLinearGradient(-this.renderer.elementWidth * 5 / 8, 0, this.renderer.elementWidth * 5 / 8, 0),
            hue = 200 + (Math.floor(this.index / 8) % 2 === 0 ? 0 : 10),
            saturation = 70 * axis.rate;

        this.showToolTip(axis);

        if(this.animationCount >= 0){
            let tick = this.ease((this.ANIMATION_COUNT - this.animationCount) / this.ANIMATION_COUNT);

            if(this.selected){
                this.z = this.z0 * (1 - tick);
            }else{
                this.z = this.z0 + (this.FAR_LIMIT - this.z0) * tick;
            }
            this.animationCount--;
        }
        gradient.addColorStop(0, 'hsla(' + hue + ', ' + saturation +'%, 30%, 0.9)');
        gradient.addColorStop(0.3, 'hsla(' + hue + ', ' + saturation +'%, 40%, 0.9)');
        gradient.addColorStop(0.5, 'hsla(' + hue + ', ' + saturation +'%, 45%, 0.9)');
        gradient.addColorStop(0.7, 'hsla(' + hue + ', ' + saturation +'%, 40%, 0.9)');
        gradient.addColorStop(1, 'hsla(' + hue + ', ' + saturation +'%, 30%, 0.9)');

        context.save();
        context.translate(axis.x, axis.y);
        context.scale(axis.rate, axis.rate);

        if(this.hovered){
            context.shadowColor = 'hsl(200, 60%, 60%)';
            context.shadowBlur = 30;
        }
        context.strokeStyle = 'hsl(200, 60%, 60%)';
        context.fillStyle = gradient;
        context.beginPath();
        context.moveTo(-width / 2, 0);
        context.lineTo(-width * 3 / 8, -height / 2);
        context.lineTo(width * 3 / 8, -height / 2);
        context.lineTo(width / 2, 0);
        context.lineTo(width * 3 / 8, height / 2);
        context.lineTo(-width * 3 / 8, height / 2);
        context.closePath();
        context.fill();
        context.stroke();

        context.fillStyle = 'hsl(0, 0%, 150%)';
        context.fillText(this.data.name, 0, 0);
        context.restore();
    },
    showToolTip : function(axis){
        if(!this.hovered){
            return;
        }
        this.renderer.showToolTip(this.data, axis);
    }
};
let CATEGORY_DATA = [
    'all',
    'Метаданные',
    'Потоковый контент',
    'Секционный контент',
    'Заголовочный контент',
    'Фразовый контент',
    'Встроенный контент',
    'Интерактивный контент',
    'Явный контент',
    'Корень задания разделов',
    'Контент форм:',
    '   listed',
    '   submittable',
    '   resettable',
    '   labelable',
    '   reassociateable',
    'Элементы поддержки скриптов',
    'Прозрачная',
    'Текст',
    'Изменяется',
    'Скрипт, Данные, Документация',
    'Слжная'
];
let ELEMENT_DATA = [
    {name: 'a', categories: [2, 5, 7, 8], contents: {categories: [17], tags: []}},
    {name: 'abbr', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'address', categories: [2, 8], contents: {categories: [2], tags: []}},
    {name: 'area', categories: [2, 5], contents: {categories: [], tags: []}},
    {name: 'article', categories: [2, 3, 8], contents: {categories: [2], tags: []}},
    {name: 'aside', categories: [2, 3, 8], contents: {categories: [2], tags: []}},
    {name: 'audio', categories: [2, 5, 6, 7], contents: {categories: [17], tags: ['source']}},
    {name: 'b', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'base', categories: [1], contents: {categories: [], tags: []}},
    {name: 'bdi', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'bdo', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'blockquote', categories: [2, 8, 9], contents: {categories: [2], tags: []}},
    {name: 'body', categories: [9], contents: {categories: [2], tags: []}},
    {name: 'br', categories: [2, 5], contents: {categories: [], tags: []}},
    {name: 'button', categories: [2, 5, 7, 8, 10, 11, 12, 14, 15], contents: {categories: [5], tags: []}},
    {name: 'canvas', categories: [2, 5, 6, 8], contents: {categories: [17], tags: []}},
    {name: 'caption', categories: [], contents: {categories: [2], tags: []}},
    {name: 'cite', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'code', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'col', categories: [], contents: {categories: [], tags: []}},
    {name: 'colgroup', categories: [], contents: {categories: [], tags: ['col', 'template']}},
    {name: 'data', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'datalist', categories: [2, 5], contents: {categories: [5], tags: ['option']}},
    {name: 'dd', categories: [], contents: {categories: [2], tags: []}},
    {name: 'del', categories: [2, 5], contents: {categories: [17], tags: []}},
    {name: 'details', categories: [2, 7, 8, 9], contents: {categories: [2], tags: ['summary']}},
    {name: 'dfn', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'dialog', categories: [2, 9], contents: {categories: [2], tags: []}},
    {name: 'div', categories: [2, 8], contents: {categories: [2], tags: []}},
    {name: 'dl', categories: [2], contents: {categories: [16], tags: ['dt', 'dd']}},
    {name: 'dt', categories: [], contents: {categories: [2], tags: []}},
    {name: 'em', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'embed', categories: [2, 5, 6, 7, 8], contents: {categories: [], tags: []}},
    {name: 'fieldset', categories: [2, 8, 9, 10, 11, 15], contents: {categories: [2], tags: ['legend']}},
    {name: 'figcaption', categories: [], contents: {categories: [2], tags: []}},
    {name: 'figure', categories: [2, 8, 9], contents: {categories: [2], tags: ['figcaption']}},
    {name: 'footer', categories: [2, 8], contents: {categories: [2], tags: []}},
    {name: 'form', categories: [2, 8], contents: {categories: [2], tags: []}},
    {name: 'h1', categories: [2, 4, 8], contents: {categories: [5], tags: []}},
    {name: 'h2', categories: [2, 4, 8], contents: {categories: [5], tags: []}},
    {name: 'h3', categories: [2, 4, 8], contents: {categories: [5], tags: []}},
    {name: 'h4', categories: [2, 4, 8], contents: {categories: [5], tags: []}},
    {name: 'h5', categories: [2, 4, 8], contents: {categories: [5], tags: []}},
    {name: 'h6', categories: [2, 4, 8], contents: {categories: [5], tags: []}},
    {name: 'head', categories: [], contents: {categories: [1], tags: []}},
    {name: 'header', categories: [2, 8], contents: {categories: [2], tags: []}},
    {name: 'hr', categories: [2], contents: {categories: [], tags: []}},
    {name: 'html', categories: [], contents: {categories: [], tags: ['head', 'body']}},
    {name: 'i', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'iframe', categories: [2, 5, 6, 7, 8], contents: {categories: [18], tags: []}},
    {name: 'img', categories: [2, 5, 6, 7, 8, 10], contents: {categories: [], tags: []}},
    {name: 'input', categories: [2, 5, 7, 10, 11, 12, 13, 14, 15], contents: {categories: [], tags: []}},
    {name: 'ins', categories: [2, 5, 8], contents: {categories: [17], tags: []}},
    {name: 'kbd', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'label', categories: [2, 5, 7, 8, 10, 15], contents: {categories: [5], tags: []}},
    {name: 'legend', categories: [], contents: {categories: [5], tags: []}},
    {name: 'li', categories: [], contents: {categories: [2], tags: []}},
    {name: 'link', categories: [1, 2, 5], contents: {categories: [], tags: []}},
    {name: 'main', categories: [2, 8], contents: {categories: [2], tags: []}},
    {name: 'map', categories: [2, 5, 8], contents: {categories: [17], tags: ['area']}},
    {name: 'mark', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'meta', categories: [1, 2, 5], contents: {categories: [], tags: []}},
    {name: 'meter', categories: [2, 5, 8, 14], contents: {categories: [5], tags: []}},
    {name: 'nav', categories: [2, 3, 8], contents: {categories: [2], tags: []}},
    {name: 'noscript', categories: [1, 2, 5], contents: {categories: [19], tags: []}},
    {name: 'object', categories: [2, 5, 6, 7, 8, 10, 11, 12, 15], contents: {categories: [17], tags: ['param']}},
    {name: 'ol', categories: [2], contents: {categories: [16], tags: ['li']}},
    {name: 'optgroup', categories: [], contents: {categories: [16], tags: ['option']}},
    {name: 'option', categories: [], contents: {categories: [18], tags: []}},
    {name: 'output', categories: [2, 5, 8, 10, 11, 13, 14, 15], contents: {categories: [5], tags: []}},
    {name: 'p', categories: [2, 8], contents: {categories: [5], tags: []}},
    {name: 'param', categories: [], contents: {categories: [], tags: []}},
    {name: 'picture', categories: [2, 5, 6], contents: {categories: [16], tags: ['source', 'img']}},
    {name: 'pre', categories: [2, 8], contents: {categories: [5], tags: []}},
    {name: 'progress', categories: [2, 5, 8, 14], contents: {categories: [5], tags: []}},
    {name: 'q', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'rb', categories: [], contents: {categories: [5], tags: []}},
    {name: 'rp', categories: [], contents: {categories: [5], tags: []}},
    {name: 'rt', categories: [], contents: {categories: [5], tags: []}},
    {name: 'rtc', categories: [], contents: {categories: [5], tags: []}},
    {name: 'ruby', categories: [2, 5, 8], contents: {categories: [5], tags: ['rp', 'rt', 'rb', 'rtc']}},
    {name: 's', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'samp', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'script', categories: [1, 2, 5, 16], contents: {categories: [20], tags: []}},
    {name: 'section', categories: [2, 3, 8], contents: {categories: [2], tags: []}},
    {
        name: 'select',
        categories: [2, 5, 7, 8, 10, 11, 12, 13, 14, 15],
        contents: {categories: [16], tags: ['option', 'optgroup']}
    },
    {name: 'small', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'source', categories: [], contents: {categories: [], tags: []}},
    {name: 'span', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'strong', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'style', categories: [1, 2], contents: {categories: [19], tags: []}},
    {name: 'sub', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'summary', categories: [], contents: {categories: [5], tags: []}},
    {name: 'sup', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {
        name: 'table',
        categories: [2, 8],
        contents: {categories: [16], tags: ['caption', 'colgroup', 'thead', 'tbody', 'tfoot', 'tr']}
    },
    {name: 'tbody', categories: [], contents: {categories: [16], tags: ['tr']}},
    {name: 'td', categories: [9], contents: {categories: [2], tags: []}},
    {name: 'template', categories: [1, 2, 5, 16], contents: {categories: [21], tags: []}},
    {name: 'textarea', categories: [2, 5, 7, 8, 10, 11, 12, 13, 14, 15], contents: {categories: [18], tags: []}},
    {name: 'tfoot', categories: [], contents: {categories: [16], tags: ['tr']}},
    {name: 'th', categories: [], contents: {categories: [2], tags: []}},
    {name: 'thead', categories: [], contents: {categories: [16], tags: ['tr']}},
    {name: 'time', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'title', categories: [1], contents: {categories: [18], tags: []}},
    {name: 'tr', categories: [], contents: {categories: [16], tags: ['th', 'td']}},
    {name: 'track', categories: [], contents: {categories: [], tags: []}},
    {name: 'u', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'ul', categories: [2], contents: {categories: [16], tags: ['li']}},
    {name: 'var', categories: [2, 5, 8], contents: {categories: [5], tags: []}},
    {name: 'video', categories: [2, 5, 6, 7, 8], contents: {categories: [17], tags: ['source']}},
    {name: 'wbr', categories: [2, 5], contents: {categories: [], tags: []}},
];
$(function(){
    RENDERER.init(CATEGORY_DATA, ELEMENT_DATA);
});