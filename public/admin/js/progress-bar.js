(function($) {
  'use strict';
  

  if ($('#circleProgress1').length) {
    var bar = new ProgressBar.Circle(circleProgress1, {
      color: '#000',
      
      
      strokeWidth: 4,
      trailWidth: 4,
      easing: 'easeInOut',
      duration: 1400,
      text: {
        autoStyleContainer: false
      },
      from: {
        color: '#aaa',
        width: 4
      },
      to: {
        color: '#677ae4',
        width: 4
      },
      
      step: function(state, circle) {
        circle.path.setAttribute('stroke', state.color);
        circle.path.setAttribute('stroke-width', state.width);

        var value = Math.round(circle.value() * 100);
        if (value === 0) {
          circle.setText('');
        } else {
          circle.setText(value);
        }

      }
    });

    bar.text.style.fontSize = '1rem';
    bar.animate(.34); 
  }

  if ($('#circleProgress2').length) {
    var bar = new ProgressBar.Circle(circleProgress2, {
      color: '#000',
      
      
      strokeWidth: 4,
      trailWidth: 4,
      easing: 'easeInOut',
      duration: 1400,
      text: {
        autoStyleContainer: false
      },
      from: {
        color: '#aaa',
        width: 4
      },
      to: {
        color: '#46c35f',
        width: 4
      },
      
      step: function(state, circle) {
        circle.path.setAttribute('stroke', state.color);
        circle.path.setAttribute('stroke-width', state.width);

        var value = Math.round(circle.value() * 100);
        if (value === 0) {
          circle.setText('');
        } else {
          circle.setText(value);
        }

      }
    });

    bar.text.style.fontSize = '1rem';
    bar.animate(.54); 
  }

  if ($('#circleProgress3').length) {
    var bar = new ProgressBar.Circle(circleProgress3, {
      color: '#000',
      
      
      strokeWidth: 4,
      trailWidth: 4,
      easing: 'easeInOut',
      duration: 1400,
      text: {
        autoStyleContainer: false
      },
      from: {
        color: '#aaa',
        width: 4
      },
      to: {
        color: '#f96868',
        width: 4
      },
      
      step: function(state, circle) {
        circle.path.setAttribute('stroke', state.color);
        circle.path.setAttribute('stroke-width', state.width);

        var value = Math.round(circle.value() * 100);
        if (value === 0) {
          circle.setText('');
        } else {
          circle.setText(value);
        }

      }
    });

    bar.text.style.fontSize = '1rem';
    bar.animate(.45); 
  }

  if ($('#circleProgress4').length) {
    var bar = new ProgressBar.Circle(circleProgress4, {
      color: '#000',
      
      
      strokeWidth: 4,
      trailWidth: 4,
      easing: 'easeInOut',
      duration: 1400,
      text: {
        autoStyleContainer: false
      },
      from: {
        color: '#aaa',
        width: 4
      },
      to: {
        color: '#f2a654',
        width: 4
      },
      
      step: function(state, circle) {
        circle.path.setAttribute('stroke', state.color);
        circle.path.setAttribute('stroke-width', state.width);

        var value = Math.round(circle.value() * 100);
        if (value === 0) {
          circle.setText('');
        } else {
          circle.setText(value);
        }

      }
    });

    bar.text.style.fontSize = '1rem';
    bar.animate(.27); 
  }

  if ($('#circleProgress5').length) {
    var bar = new ProgressBar.Circle(circleProgress5, {
      color: '#000',
      
      
      strokeWidth: 4,
      trailWidth: 4,
      easing: 'easeInOut',
      duration: 1400,
      text: {
        autoStyleContainer: false
      },
      from: {
        color: '#aaa',
        width: 4
      },
      to: {
        color: '#57c7d4',
        width: 4
      },
      
      step: function(state, circle) {
        circle.path.setAttribute('stroke', state.color);
        circle.path.setAttribute('stroke-width', state.width);

        var value = Math.round(circle.value() * 100);
        if (value === 0) {
          circle.setText('');
        } else {
          circle.setText(value);
        }

      }
    });

    bar.text.style.fontSize = '1rem';
    bar.animate(.67); 
  }

  if ($('#circleProgress6').length) {
    var bar = new ProgressBar.Circle(circleProgress6, {
      color: '#000',
      
      
      strokeWidth: 4,
      trailWidth: 4,
      easing: 'easeInOut',
      duration: 1400,
      text: {
        autoStyleContainer: false
      },
      from: {
        color: '#aaa',
        width: 4
      },
      to: {
        color: '#2a2e3b',
        width: 4
      },
      
      step: function(state, circle) {
        circle.path.setAttribute('stroke', state.color);
        circle.path.setAttribute('stroke-width', state.width);

        var value = Math.round(circle.value() * 100);
        if (value === 0) {
          circle.setText('');
        } else {
          circle.setText(value);
        }

      }
    });

    bar.text.style.fontSize = '1rem';
    bar.animate(.95); 
  }
  if($('.progress-bar-js-line').length) {
    var line = new ProgressBar.Line('.progress-bar-js-line')  
  }
})(jQuery);