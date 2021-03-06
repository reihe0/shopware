;(function($, window, document, undefined) {
    "use strict";

    /**
     * Local private variables.
     */
    var $window = $(window),
        $body = $('body');

    /**
     * Emotion Loader Plugin
     *
     * This plugin is called on emotion wrappers to load emotion worlds
     * for the specific device types dynamically via ajax.
     */
    $.plugin('swEmotionLoader', {

        alias: 'emotionLoader',

        defaults: {

            /**
             * The url of the controller to load the emotion world.
             *
             * @property controllerUrl
             * @type {string}
             */
            controllerUrl: null,

            /**
             * The names of the devices for which the emotion world is available.
             *
             * @property availableDevices
             * @type {string}
             */
            availableDevices: null,

            /**
             * Show or hide the listing on category pages.
             *
             * @property showListing
             * @type {boolean}
             */
            showListing: false,

            /**
             * Configuration object to map device types to IDs.
             *
             * @property deviceTypes
             * @type {object}
             */
            deviceTypes: {
                'xl': '0',
                'l' : '1',
                'm' : '2',
                's' : '3',
                'xs': '4'
            },

            /**
             * The DOM selector of emotion wrapper elements
             *
             * @property wrapperSelector,
             * @type {string}
             */
            wrapperSelector: '.emotion--wrapper',

            /**
             * The DOM selector of the fallback content
             * if no emotion world is available.
             *
             * @property fallbackContentSelector
             * @type {string}
             */
            fallbackContentSelector: '.listing--wrapper',

            /**
             * The DOM selector of the show listing link.
             *
             * @property showListingSelector
             * @type {string}
             */
            showListingSelector: '.emotion--show-listing',

            /**
             * The DOM selector for the loading overlay.
             *
             * @property loadingOverlaySelector
             * @type {string}
             */
            loadingOverlaySelector: '.emotion--overlay'
        },

        /**
         * Plugin constructor
         */
        init: function() {
            var me = this,
                opts = me.opts;

            me.applyDataAttributes();

            if (opts.controllerUrl === null ||
                opts.availableDevices === null) {
                me.$el.remove();
                return;
            }

            me.$emotion = false;

            me.$siblings = me.$el.siblings(opts.wrapperSelector);

            me.hasSiblings = (me.$siblings.length > 0);
            me.availableDevices = (opts.availableDevices + '').split(',');

            me.$fallbackContent = $(opts.fallbackContentSelector);
            me.$showListingLink = $(opts.showListingSelector);

            me.$overlay = $(me.opts.loadingOverlaySelector);

            if (!opts.showListing) {
                me.hideFallbackContent();
            }

            me.loadEmotion();
            me.registerEvents();
        },

        /**
         * Registers all necessary event listner.
         */
        registerEvents: function() {
            var me = this;

            StateManager.on('resize', $.proxy(me.onDeviceChange, me));

            $.publish('plugin/swEmotionLoader/onRegisterEvents', me);
        },

        /**
         * Called on resize event of the StateManager.
         */
        onDeviceChange: function() {
            var me = this;

            me.loadEmotion();

            $.publish('plugin/swEmotionLoader/onDeviceChange', me);
        },

        /**
         * Loads an emotion world for a given device state.
         * If the emotion world for the state was already loaded
         * it will just be initialized again from local save.
         *
         * @param controllerUrl
         * @param deviceState
         */
        loadEmotion: function(controllerUrl, deviceState) {
            var me = this,
                devices = me.availableDevices,
                types = me.opts.deviceTypes,
                url = controllerUrl || me.opts.controllerUrl,
                state = deviceState || StateManager.getCurrentState();

            /**
             * If the emotion world is not defined for the current device,
             * hide the wrapper element and show the default content.
             */
            if (devices.indexOf(types[state]) === -1) {
                var hasSameDeviceSibling = false;

                me.hideEmotion();

                me.$siblings.each(function(index, el) {
                    var devices = $(el).attr('data-availabledevices');

                    if (devices.indexOf(types[state]) !== -1) {
                        hasSameDeviceSibling = true;
                    }
                });

                if (!hasSameDeviceSibling) me.showFallbackContent();
                return;
            }

            /**
             * If the plugin is not configured correctly show the default content.
             */
            if (!devices.length || !state.length || !url.length) {
                me.hideEmotion();
                me.showFallbackContent();
                return;
            }

            /**
             * If the emotion world was already loaded show it.
             */
            if (me.$emotion.length) {

                (me.opts.showListing) ? me.showFallbackContent() : me.hideFallbackContent();

                me.$overlay.remove();
                me.showEmotion();
                return;
            }

            /**
             * Show the loading indicator and load the emotion world.
             */
            me.showEmotion();

            if (me.isLoading) {
                return;
            }

            me.isLoading = true;
            me.$overlay.insertBefore('.content-main');

            $.ajax({
                url: url,
                method: 'GET',
                success: function (response) {

                    me.isLoading = false;
                    me.$overlay.remove();

                    $.publish('plugin/swEmotionLoader/onLoadEmotionLoaded', me);

                    if (!response.length) {
                        me.hideEmotion();
                        me.showFallbackContent();
                        return;
                    }

                    (me.opts.showListing) ? me.showFallbackContent() : me.hideFallbackContent();

                    me.initEmotion(response);

                    $.publish('plugin/swEmotionLoader/onLoadEmotionFinished', me);
                }
            });

            /** @deprecated - will be removed in 5.1 */
            $.publish('plugin/emotionLoader/loadEmotion', me);

            $.publish('plugin/swEmotionLoader/onLoadEmotion', me);
        },

        /**
         * Removes the content of the container by
         * the new emotion world markup and initializes it.
         *
         * @param html
         */
        initEmotion: function(html) {
            var me = this;

            me.$el.html(html);
            me.$emotion = me.$el.find('*[data-emotion="true"]');

            if (!me.$emotion.length) {
                me.showFallbackContent();
                return;
            }

            me.$emotion.swEmotion();

            /** @deprecated - will be removed in 5.1 */
            $.publish('plugin/emotionLoader/initEmotion', me);

            $.publish('plugin/swEmotionLoader/onInitEmotion', [me, html]);
        },

        /**
         * Shows the emotion world.
         */
        showEmotion: function() {
            var me = this;

            me.$el.css('display', 'block');

            /** @deprecated - will be removed in 5.1 */
            $.publish('plugin/emotionLoader/showEmotion', me);

            $.publish('plugin/swEmotionLoader/onShowEmotion', me);
        },

        /**
         * Hides the emotion world.
         */
        hideEmotion: function() {
            var me = this;

            me.$el.css('display', 'none');

            /** @deprecated - will be removed in 5.1 */
            $.publish('plugin/emotionLoader/hideEmotion', me);

            $.publish('plugin/swEmotionLoader/onHideEmotion', me);
        },

        /**
         * Shows the fallback content.
         */
        showFallbackContent: function() {
            var me = this;

            me.$fallbackContent.removeClass('is--hidden');
            me.$showListingLink.addClass('is--hidden');

            me.$overlay.remove();

            StateManager.updatePlugin('*[data-infinite-scrolling="true"]', 'swInfiniteScrolling');

            /** @deprecated - will be removed in 5.1 */
            $.publish('plugin/emotionLoader/showFallbackContent', me);

            $.publish('plugin/swEmotionLoader/onShowFallbackContent', me);
        },

        /**
         * Hides the fallback content.
         */
        hideFallbackContent: function() {
            var me = this;

            me.$fallbackContent.addClass('is--hidden');
            me.$showListingLink.removeClass('is--hidden');

            StateManager.updatePlugin('*[data-infinite-scrolling="true"]', 'swInfiniteScrolling');

            /** @deprecated - will be removed in 5.1 */
            $.publish('plugin/emotionLoader/hideFallbackContent', me);

            $.publish('plugin/swEmotionLoader/onHideFallbackContent', me);
        },

        /**
         * Destroys the plugin.
         */
        destroy: function() {
            var me = this;

            me._destroy();
        }
    });


    /**
     * Emotion plugin
     *
     * This plugin is called on each single emotion world
     * for handling the grid sizing and all elements in it.
     */
    $.plugin('swEmotion', {

        alias: 'emotion',

        defaults: {

            /**
             * The grid mode of the emotion grid.
             *
             * @property gridMode ( resize | masonry )
             * @type {string}
             */
            gridMode: 'resize',

            /**
             * The base width in px for dynamic measurement.
             * Used for resize mode to have a base orientation for scaling.
             * Number is based on the fixed container width in desktop mode.
             *
             * @property baseWidth
             * @type {number}
             */
            baseWidth: 1160,

            /**
             * Turn fullscreen mode on and off.#
             *
             * @property fullScreen
             * @type {boolean}
             */
            fullscreen: false,

            /**
             * The number of columns in the grid.
             *
             * @property columns
             * @type {number}
             */
            columns: 4,

            /**
             * The height of one grid cell in px.
             *
             * @property cellHeight
             * @type {number}
             */
            cellHeight: 185,

            /**
             * The space in px between the elements in the grid.
             *
             * @property cellSpacing
             * @type {number}
             */
            cellSpacing: 10,

            /**
             * The duration for the masonry animation.
             *
             * @property transitionDuration
             * @type {string}
             */
            transitionDuration: '0.25s',

            /**
             * The DOM selector for the emotion elements.
             *
             * @property elementSelector
             * @type {string}
             */
            elementSelector: '.emotion--element',

            /**
             * The DOM selector for the sizer element.
             *
             * @property elementSelector
             * @type {string}
             */
            gridSizerSelector: '.emotion--sizer',

            /**
             * The DOM selector for banner elements.
             *
             * @property bannerElSelector
             * @type {string}
             */
            bannerElSelector: '[data-coverImage="true"]',

            /**
             * The DOM selector for video elements.
             *
             * @property videoElSelector
             * @type {string}
             */
            videoElSelector: '.emotion--video'
        },

        /**
         * Plugin constructor
         */
        init: function() {
            var me = this;

            me.applyDataAttributes();

            me.bufferedCall = false;

            me.$contentMain = $('.content-main');
            me.$container = me.$el.parents('.content--emotions');
            me.$wrapper = me.$el.parents('.emotion--wrapper');

            me.$elements = me.$el.find(me.opts.elementSelector);
            me.$gridSizer = me.$el.find(me.opts.gridSizerSelector);

            me.$bannerElements = me.$elements.find(me.opts.bannerElSelector);
            me.$videoElements = me.$elements.find(me.opts.videoElSelector);
            me.$productSliderElements = me.$elements.find('*[data-product-slider="true"]');

            me.remSpacing = ~~me.opts.cellSpacing / 16;

            if (me.opts.fullscreen) {
                me.initFullscreen();
            }

            if (me.opts.gridMode === 'masonry') {
                me.initMasonryGrid();
            }

            if (me.opts.gridMode === 'resize') {
                me.initScaleGrid();
            }

            me.initElements();
            me.registerEvents();
        },

        /**
         * Initializes special elements and their needed plugins.
         */
        initElements: function() {
            var me = this;

            $.each(me.$bannerElements, function(index, item) {
                $(item).swEmotionBanner();
            });

            $.each(me.$videoElements, function(index, item) {
                $(item).swEmotionVideo();
            });

            StateManager.updatePlugin('*[data-product-slider="true"]', 'swProductSlider');
            StateManager.updatePlugin('*[data-image-slider="true"]', 'swImageSlider');

            window.picturefill();

            /** @deprecated - will be removed in 5.1 */
            $.publish('plugin/emotion/initElements', me);

            $.publish('plugin/swEmotion/onInitElements', me);
        },

        /**
         * Initializes the fullscreen mode.
         */
        initFullscreen: function() {
            var me = this;

            $body.addClass('is--no-sidebar');
            me.$contentMain.addClass('is--fullscreen');

            /** @deprecated - will be removed in 5.1 */
            $.publish('plugin/emotion/initFullscreen', me);

            $.publish('plugin/swEmotion/onInitFullscreen', me);
        },

        /**
         * Removes the fullscreen mode.
         */
        removeFullscreen: function(showSidebar) {
            var me = this;

            if (showSidebar) $body.removeClass('is--no-sidebar');
            me.$contentMain.removeClass('is--fullscreen');

            /** @deprecated - will be removed in 5.1 */
            $.publish('plugin/emotion/removeFullscreen', me);

            $.publish('plugin/swEmotion/onRemoveFullscreen', [me, showSidebar]);
        },

        /**
         * Initializes the grid for the masonry type.
         */
        initMasonryGrid: function() {
            var me = this;

            me.$el.css({
                'margin-left': -me.remSpacing + 'rem'
            });

            me.$el.masonry({
                'gutter': 0, // Gutter space is managed via css
                'itemSelector': me.opts.itemSelector,
                'transitionDuration': me.opts.transitionDuration,
                'columnWidth': me.$gridSizer[0]
            });

            /** @deprecated - will be removed in 5.1 */
            $.publish('plugin/emotion/initMasonryGrid', me);

            $.publish('plugin/swEmotion/onInitMasonryGrid', me);
        },

        /**
         * Initializes the grid for the resizing type.
         */
        initScaleGrid: function() {
            var me = this;

            me.baseWidth = ~~me.opts.baseWidth;
            me.ratio = me.baseWidth / me.$el.outerHeight();

            me.$el.css('width', me.baseWidth + me.opts.cellSpacing);

            if (!me.opts.fullscreen) {
                me.$wrapper.css('max-width', me.baseWidth);
            }

            me.scale();

            /** @deprecated - will be removed in 5.1 */
            $.publish('plugin/emotion/initScaleGrid', me);

            $.publish('plugin/swEmotion/onInitScaleGrid', me);
        },

        /**
         * Registers all necessary event listener.
         */
        registerEvents: function() {
            var me = this;

            StateManager.on('resize', $.proxy(me.onResize, me));

            if (me.opts.fullscreen) {
                $.subscribe('plugin/swEmotionLoader/onShowEmotion', $.proxy(me.onShow, me));
                $.subscribe('plugin/swEmotionLoader/onHideEmotion', $.proxy(me.onHide, me));
            }

            /** @deprecated - will be removed in 5.1 */
            $.publish('plugin/emotion/registerEvents', me);

            $.publish('plugin/swEmotion/onRegisterEvents', me);
        },

        /**
         * Called by event listener on window resize.
         */
        onResize: function() {
            var me = this;

            if (me.opts.gridMode === 'resize') {
                me.scale();
            }

            me.$bannerElements.trigger('emotionResize');
            me.$videoElements.trigger('emotionResize');

            $.publish('plugin/swEmotion/onResize', me);
        },

        onShow: function(event, emotion) {
            var me = this;

            if (emotion.$el.is(me.$el)) {
                me.initFullscreen();
            }

            $.publish('plugin/swEmotion/onShow', [me, event, emotion]);
        },

        onHide: function(event, emotion) {
            var me = this;

            if (emotion.$el.is(me.$el)) {
                me.removeFullscreen();
            }

            $.publish('plugin/swEmotion/onHide', [me, event, emotion]);
        },

        /**
         * Scales the emotion grid via css3 transformation for resize mode.
         */
        scale: function() {
            var me = this,
                width = (me.opts.fullscreen) ? $window.outerWidth() : me.$wrapper.outerWidth(),
                factor = width / me.baseWidth,
                wrapperHeight = width / me.ratio;

            me.$el.css({
                '-ms-transform': 'scale('+ factor +') translateX(' + -me.remSpacing + 'rem)',
                '-o-transform': 'scale('+ factor +') translateX(' + -me.remSpacing + 'rem)',
                '-moz-transform': 'scale('+ factor +') translateX(' + -me.remSpacing + 'rem)',
                '-webkit-transform': 'scale('+ factor +') translateX(' + -me.remSpacing + 'rem)',
                'transform': 'scale('+ factor +') translateX(' + -me.remSpacing + 'rem)'
            });

            me.$wrapper.css('height', wrapperHeight);

            $.publish('plugin/swEmotion/onScale', [me, width, factor, wrapperHeight]);
        },

        /**
         * Buffers the calling of a function.
         *
         * @param func
         * @param bufferTime
         */
        buffer: function(func, bufferTime) {
            var me = this;

            window.clearTimeout(me.bufferedCall);

            me.bufferedCall = window.setTimeout($.proxy(func, me), bufferTime);

            $.publish('plugin/swEmotion/onBuffer', [me, me.bufferedCall, func, bufferTime]);
        },

        /**
         * Destroys the plugin.
         */
        destroy: function() {
            var me = this;

            me._destroy();
        }
    });


    /**
     * Emotion Banner Element
     *
     * This plugin handles banner elements in an emotion world.
     */
    $.plugin('swEmotionBanner', {

        alias: 'emotionBanner',

        defaults: {

            /**
             * The width of the image in px.
             *
             * @property width
             * @type {number}
             */
            width: null,

            /**
             * The height of the image in px.
             *
             * @proeprty height
             * @type {number}
             */
            height: null,

            /**
             * The DOM selector for the banner container.
             *
             * @property containerSelector
             * @type {string}
             */
            containerSelector: '.banner--content'
        },

        /**
         * Plugin constructor
         */
        init: function() {
            var me = this;

            me.applyDataAttributes();

            me.$container = me.$el.find(me.opts.containerSelector);

            me.imageRatio = me.opts.width / me.opts.height;

            me.resizeBanner();
            me.registerEvents();
        },

        /**
         * Registers all necessary event listener.
         */
        registerEvents: function() {
            var me = this;

            me._on(me.$el, 'emotionResize', $.proxy(me.resizeBanner, me));

            $.publish('plugin/swEmotionBanner/onRegisterEvents', me);
        },

        /**
         * Does the measuring for the banner mapping container
         * and sets it's new dimensions.
         */
        resizeBanner: function() {
            var me = this,
                containerWidth = me.$el.width(),
                containerHeight = me.$el.height(),
                containerRatio = containerWidth / containerHeight,
                orientation = me.imageRatio > containerRatio,
                bannerWidth = orientation ? containerHeight * me.imageRatio : '100%',
                bannerHeight = orientation ? '100%' : containerWidth / me.imageRatio;

            me.$container.css({
                'width': bannerWidth,
                'height': bannerHeight
            });

            $.publish('plugin/swEmotionBanner/onResizeBanner', me);
        },

        /**
         * Destroys the plugin.
         */
        destroy: function() {
            var me = this;

            me._destroy();
        }
    });


    /**
     * Emotion Video Element
     *
     * This plugin handles html5 video elements in an emotion world.
     */
    $.plugin('swEmotionVideo', {

        alias: 'emotionVideo',

        defaults: {

            /**
             * The sizing mode for the video.
             *
             * @property mode ( scale | cover | stretch )
             * @type {string}
             */
            mode: 'cover',

            /**
             * The X coordinate for the transform origin.
             *
             * @property scaleOriginX
             * @type {number}
             */
            scaleOriginX: 50,

            /**
             * The Y coordinate for the transform origin.
             *
             * @property scaleOriginX
             * @type {number}
             */
            scaleOriginY: 50,

            /**
             * The scale factor for the transforming.
             *
             * @property scale
             * @type {number}
             */
            scale: 1,

            /**
             * The css class for the play icon.
             *
             * @property playIconCls
             * @type {string}
             */
            playIconCls: 'icon--play',

            /**
             * The css class for the pause icon.
             *
             * @property pauseIconCls
             * @type {string}
             */
            pauseIconCls: 'icon--pause',

            /**
             * The DOM selector for the video element.
             *
             * @property videoSelector
             * @type {string}
             */
            videoSelector: '.video--element',

            /**
             * The DOM selector for the video cover element.
             *
             * @property coverSelector
             * @type {string}
             */
            coverSelector: '.video--cover',

            /**
             * The DOM selector for the play button.
             *
             * @property playBtnSelector
             * @type {string}
             */
            playBtnSelector: '.video--play-btn',

            /**
             * The DOM selector for the play icon.
             *
             * @property playIconSelector
             * @type {string}
             */
            playIconSelector: '.video--play-icon'
        },

        /**
         * Plugin constructor
         */
        init: function() {
            var me = this;

            me.applyDataAttributes();

            me.$video = me.$el.find(me.opts.videoSelector);
            me.$videoCover = me.$el.find(me.opts.coverSelector);
            me.$playBtn = me.$el.find(me.opts.playBtnSelector);
            me.$playBtnIcon = me.$playBtn.find(me.opts.playIconSelector);

            me.player = me.$video.get(0);

            /**
             * Cross browser mute support.
             */
            if (me.$video.attr('muted') !== undefined) {
                me.player.volume = 0.0;
            }

            me.setScaleOrigin(me.opts.scaleOriginX, me.opts.scaleOriginY);

            me.registerEvents();
        },

        /**
         * Registers all necessary event listener.
         */
        registerEvents: function() {
            var me = this;

            me._on(me.$video, 'loadedmetadata', $.proxy(me.onLoadMeta, me));
            me._on(me.$video, 'canplay', $.proxy(me.onCanPlay, me));
            me._on(me.$video, 'play', $.proxy(me.onVideoPlay, me));
            me._on(me.$video, 'ended', $.proxy(me.onVideoEnded, me));

            me._on(me.$el, 'emotionResize', $.proxy(me.resizeVideo, me));

            me._on(me.$videoCover, 'click', $.proxy(me.onPlayClick, me));
            me._on(me.$playBtn, 'click', $.proxy(me.onPlayClick, me));

            $.publish('plugin/swEmotionVideo/onRegisterEvents', me);
        },

        /**
         * Called on loaded meta data event.
         * Gets the video properties from the loaded video.
         */
        onLoadMeta: function(event) {
            var me = this;

            me.videoWidth = me.player.videoWidth;
            me.videoHeight = me.player.videoHeight;
            me.videoRatio = me.videoWidth / me.videoHeight;

            me.resizeVideo();

            $.publish('plugin/swEmotionVideo/onLoadMeta', [me, event]);
        },

        /**
         * Called on can play event.
         * Sets the correct play button icon.
         */
        onCanPlay: function(event) {
            var me = this;

            if(!me.player.paused || me.player.autoplay) {
                me.$playBtnIcon.addClass(me.opts.pauseIconCls).removeClass(me.opts.playIconCls);
            }

            $.publish('plugin/swEmotionVideo/onCanPlay', [me, event]);
        },

        /**
         * Called on play event.
         */
        onVideoPlay: function(event) {
            var me = this;

            me.$videoCover.hide();

            $.publish('plugin/swEmotionVideo/onVideoPlay', [me, event]);
        },

        /**
         * Called on ended event.
         * Sets the correct play button icon.
         */
        onVideoEnded: function(event) {
            var me = this;

            me.$playBtnIcon.removeClass(me.opts.pauseIconCls).addClass(me.opts.playIconCls);

            $.publish('plugin/swEmotionVideo/onVideoEnded', [me, event]);
        },

        /**
         * Called on click event on the the play button.
         * Starts or pauses the video.
         */
        onPlayClick: function(event) {
            var me = this;

            event.preventDefault();

            (me.player.paused) ? me.playVideo() : me.stopVideo();

            $.publish('plugin/swEmotionVideo/onPlayClick', [me, event]);
        },

        /**
         * Starts the video and sets the correct play button icon.
         */
        playVideo: function() {
            var me = this;

            me.$playBtnIcon.addClass(me.opts.pauseIconCls).removeClass(me.opts.playIconCls);
            me.player.play();

            $.publish('plugin/swEmotionVideo/onPlayVideo', me);
        },

        /**
         * Pauses the video and sets the correct play button icon.
         */
        stopVideo: function() {
            var me = this;

            me.$playBtnIcon.removeClass(me.opts.pauseIconCls).addClass(me.opts.playIconCls);
            me.player.pause();

            $.publish('plugin/swEmotionVideo/onStopVideo', me);
        },

        /**
         * Measures the correct dimensions for the video
         * based on the transformation mode.
         */
        resizeVideo: function() {
            var me = this;

            /**
             * Do nothing because it is the standard browser behaviour.
             * The empty space will be filled by black bars.
             */
            if (me.opts.mode === 'scale') {
                return;
            }

            var containerWidth = me.$el.outerWidth(),
                containerHeight = me.$el.outerHeight(),
                containerRatio = containerWidth / containerHeight,
                orientation = me.videoRatio > containerRatio,
                positiveFactor = me.videoRatio / containerRatio,
                negativeFactor = containerRatio / me.videoRatio;

            /**
             * Stretches the video to fill the hole container
             * no matter what dimensions the container has.
             */
            if (me.opts.mode === 'stretch') {
                if (orientation) {
                    me.transformVideo('scaleY(' + positiveFactor * me.opts.scale + ')');
                } else {
                    me.transformVideo('scaleX(' + negativeFactor * me.opts.scale + ')');
                }
            }

            /**
             * Scales up the video to fill the hole container by
             * keeping the video dimensions but cutting overlapping content.
             */
            if (me.opts.mode === 'cover') {
                if (orientation) {
                    me.transformVideo('scaleX(' + positiveFactor * me.opts.scale + ') scaleY(' + positiveFactor * me.opts.scale + ')');
                } else {
                    me.transformVideo('scaleX(' + negativeFactor * me.opts.scale + ') scaleY(' + negativeFactor * me.opts.scale + ')');
                }
            }

            $.publish('plugin/swEmotionVideo/onResizeVideo', me);
        },

        /**
         * Sets the transform origin coordinates on the video element.
         *
         * @param originX
         * @param originY
         */
        setScaleOrigin: function(originX, originY) {
            var me = this,
                x = originX || me.opts.scaleOriginX,
                y = originY || me.opts.scaleOriginY,
                origin = x+'% '+y+'%';

            me.$video.css({
                '-ms-transform-origin': origin,
                '-o-transform-origin': origin,
                '-moz-transform-origin': origin,
                '-webkit-transform-origin': origin,
                'transform-origin': origin
            });

            $.publish('plugin/swEmotionVideo/onSetScaleOrigin', [me, x, y]);
        },

        /**
         * Transforms the video by the given css3 transformation.
         *
         * @param transformation
         */
        transformVideo: function(transformation) {
            var me = this;

            me.$video.css({
                '-ms-transform': transformation,
                '-o-transform': transformation,
                '-moz-transform': transformation,
                '-webkit-transform': transformation,
                'transform': transformation
            });

            $.publish('plugin/swEmotionVideo/onTransformVideo', [me, transformation]);
        },

        /**
         * Destroys the plugin.
         */
        destroy: function() {
            var me = this;

            me._destroy();
        }
    });

})(jQuery, window, document);
