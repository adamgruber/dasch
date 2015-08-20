/*global module, interact*/
/*
  Dasch.js

 Version: 0.1.0
  Author: Adam Gruber
    Repo: - https://github.com/adamgruber/dasch/
  Issues: - https://github.com/adamgruber/dasch/issues
 */

(function(factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define(['velocity', 'interact'], factory);
  } else if (typeof exports !== 'undefined') {
    module.exports = factory(require('velocity'), require('interact'));
  } else {
    factory(jQuery, interact);
  }

}(function ($, interact) {
  'use strict';
  var Dasch = window.Dasch || {};

  Dasch = (function () {
    var instanceId = 0;
    function Dasch(element, settings) {
      this.instanceId = instanceId++;

      this.defaults = {
        pointerMoveTolerance: 10,
        placeholder: '<section class="dasch-placeholder"/>',
        dropAccept: '.dasch-dragging',
        dropOverlap: 'pointer',
        preventDefault: 'auto',
        styleDragCursor: true,
        dragOpacity: 0.2,
        snapBackOnDragEnd: false,
        velocity: {
          drag: {
            duration: 0,
            easing: 'linear'
          }
        }
      };

      this.dashCnt = element;
      this.$dashCnt = $(element);
      
      this.options = $.extend({}, this.defaults, settings);

      // Bind 'this' context to listeners
      // Drag
      this.dragStartListener = $.proxy(this.dragStartListener, this);
      this.dragMoveListener = $.proxy(this.dragMoveListener, this);
      this.dragEndListener = $.proxy(this.dragEndListener, this);
      // Drop
      this.dragEnterListener = $.proxy(this.dragEnterListener, this);
      this.dragLeaveListener = $.proxy(this.dragLeaveListener, this);
      this.dropMoveListener = $.proxy(this.dropMoveListener, this);
      this.dropListener = $.proxy(this.dropListener, this);

      this.dragCompleteFn = $.proxy(this.dragCompleteFn, this);

      this.init();
    }

    return Dasch;
  }());

  Dasch.prototype.setInteractDefaults = function () {
    // Distance pointer must be moved before an action sequence occurs
    interact.pointerMoveTolerance(this.options.pointerMoveTolerance);
  };

  Dasch.prototype.init = function () {
    // Create the interactables
    if (this.options.dragElement) {
      this.dragInteractable = interact(this.options.dragElement, {
        context: this.dashCnt,
        allowFrom: this.options.allowFrom,
        ignoreFrom: this.options.ignoreFrom,
        preventDefault: this.options.preventDefault,
      }).styleCursor(this.options.styleDragCursor);
      this.initDraggable();
    }

    if (this.options.dropElement) {
      this.dropInteractable = interact(this.options.dropElement, {
        context: this.dashCnt,
        accept: this.options.dropAccept,
        overlap: this.options.dropOverlap,
      });
      // Support custom dropChecker function
      if (this.options.dropChecker) {
        this.dropInteractable.dropChecker(this.options.dropChecker);
      }
      this.initDropzones();
    }
  };

  Dasch.prototype.initDraggable = function () {
    this.dragInteractable.draggable({
      onstart: this.dragStartListener,
      onmove: this.dragMoveListener,
      onend: this.dragEndListener
    });
  };

  Dasch.prototype.initDropzones = function () {
    this.dropInteractable.dropzone({
      ondragenter: this.dragEnterListener,
      ondragleave: this.dragLeaveListener,
      ondropmove: this.dropMoveListener,
      ondrop: this.dropListener
    });
  };

  /* === Drag Listener Functions === */

  Dasch.prototype.dragStartListener = function (e) {
    var $dragEl = $(e.target),
        origPosition = $dragEl.position();

    // Update main container classes
    this.$dashCnt.addClass('dasch-drag-enabled');

    // Trigger drag start event
    this.$dashCnt.trigger({
      type: 'dasch.dragStart',
      dragEl: e.target,
      iEvent: e
    });

    // Set basic styles for drag element
    // Custom styles can be applied to the dasch-dragging class
    $dragEl
      .addClass('dasch-dragging')
      .css({
        position: 'absolute',
        top: origPosition.top,
        left: origPosition.left,
        width: $dragEl.outerWidth(),
        height: $dragEl.outerHeight(),
        opacity: this.options.dragOpacity
      })

      // Insert the placeholder for drag element
      .before(this.createDragElPlaceholder($dragEl));

    // Keep reference to drag element placeholder
    this.$dragElPlaceholder = $(e.target).prev('.dasch-placeholder');

    // Trigger drag started event
    this.$dashCnt.trigger({
      type: 'dasch.dragStarted',
      dragEl: e.target,
      iEvent: e
    });
  };

  Dasch.prototype.dragMoveListener = function (e) {
    var $dragEl = $(e.target),
        // keep the dragged position in the data-x/data-y attributes
        x = (parseFloat($dragEl.attr('data-x')) || 0) + e.dx,
        y = (parseFloat($dragEl.attr('data-y')) || 0) + e.dy;

    // translate the element
    $dragEl.velocity({
      translateX: x + 'px',
      translateY: y + 'px',
      translateZ: 0
    }, this.options.velocity.drag);

    // update the posiion attributes
    $dragEl.attr('data-x', x);
    $dragEl.attr('data-y', y);
  };

  Dasch.prototype.dragEndListener = function (e) {
    var dropOccurred = e.interaction.dropElement !== null;
    // Trigger drag end event
    this.$dashCnt.trigger({
      type: 'dasch.dragEnd',
      dragEl: e.target,
      iEvent: e
    });

    // Return drag el to original position
    if (this.options.snapBackOnDragEnd && !dropOccurred) {
      this.snapBack(e.target);
    }
  };

  /* === Drop Listener Functions === */

  Dasch.prototype.dragEnterListener = function (e) {
    var $dropzone = $(e.target);
    $dropzone.addClass('dasch-drop-active');
    
    // Trigger dropEnter event
    this.$dashCnt.trigger({
      type: 'dasch.dropEnter',
      dropEl: e.target,
      dragEl: e.relatedTarget,
      iEvent: e
    });
  };

  Dasch.prototype.dragLeaveListener = function (e) {
    var $dropzone = $(e.target);
    $dropzone.removeClass('dasch-drop-active');

    // Trigger dropLeave event
    this.$dashCnt.trigger({
      type: 'dasch.dropLeave',
      dropEl: e.target,
      dragEl: e.relatedTarget,
      iEvent: e
    });
  };

  Dasch.prototype.dropMoveListener = function (e) {
    // Trigger dropMove event
    this.$dashCnt.trigger({
      type: 'dasch.dropMove',
      dropEl: e.target,
      dragEl: e.relatedTarget,
      iEvent: e
    });
  };

  Dasch.prototype.dropListener = function (e) {
    var $dropzone = $(e.target);
    $dropzone.removeClass('dasch-drop-active');

    // Trigger drop event
    this.$dashCnt.trigger({
      type: 'dasch.drop',
      dropEl: e.target,
      dragEl: e.relatedTarget,
      iEvent: e
    });
  };

  /* === Helper Functions === */

  Dasch.prototype.createDragElPlaceholder = function ($el) {
    return $(this.options.placeholder)
      .addClass(this.options.placeholderClass)
      .css({
        height: $el.outerHeight()
      });
  };

  Dasch.prototype.removePlaceholder = function () {
    this.$dragElPlaceholder.remove();
  };

  Dasch.prototype.snapBack = function (dragEl) {
    var $el = $(dragEl),
        props = {
          translateX: 0,
          translateY: 0,
          translatez: 0
        },
        opts = {
          easing: [250, 20],
          complete: $.isFunction(this.options.dragCompleteFn) ? this.options.dragCompleteFn(this, dragEl) : this.dragCompleteFn(dragEl)
        };

    $el.velocity(props, opts);
  };

  Dasch.prototype.dragCompleteFn = function (element) {
    var $el = $(element);
    this.removePlaceholder();
    $el
      .removeAttr('style data-x data-y')
      .removeClass('dasch-dragging');

    this.$dashCnt.removeClass('dasch-drag-enabled');
    
    // Trigger drag ended event
    this.$dashCnt.trigger({
      type: 'dasch.dragEnded',
      $dragEl: $el,
      $dashCnt: this.$dashCnt
    });
  };

  /* === 
   * Plugin Definition
   * ===
  */
  $.fn.dasch = function() {
    var self = this,
        opt = arguments[0],
        args = Array.prototype.slice.call(arguments, 1),
        l = self.length,
        i = 0,
        ret;
    for (i; i < l; i++) {
      if (typeof opt === 'object' || typeof opt === 'undefined') {
        self[i].dasch = new Dasch(self[i], opt); // create new dasch object on the dom element
      } else {
        ret = self[i].dasch[opt].apply(self[i].dasch, args); // to call dasch methods via el.dasch('methodName', args)
      }

      if (typeof ret !== 'undefined') {
        return ret;
      }
    }
    return self;
  };
  
  return $;

}));
