function readURL(input, imgId) {
  if (input.files && input.files[0]) {
      var reader = new FileReader();
      reader.onload = function (e) {
          $('#' + imgId).attr('src', e.target.result);
      };
      reader.readAsDataURL(input.files[0]);
  }
}





function convertToSlug(TextObj) {
  $("#slug").val(TextObj.value.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-'));
}







function buttonLoading(processType, ele) {
  if (processType == 'loading') {
      ele.html(ele.attr('data-loading-text'));
      ele.attr('disabled', true);
  } else {
      ele.html(ele.attr('data-rest-text'));
      ele.attr('disabled', false);
  }
}

function successMsg(heading, message, html = "") {

  Snackbar.show({
      text: message,
      backgroundColor: '#232323',
      width: '475px',
      pos: 'bottom-right'
  });

}

function errorMsg(heading, message) {
  Snackbar.show({
      text: message,
      backgroundColor: '#930000',
      width: '475px',
      pos: 'bottom-right'
  });
}






function isCharKey(evt) {
  var charCode = (evt.which) ? evt.which : evt.keyCode
  if (charCode > 32 && (charCode < 97 || charCode > 122) && (charCode < 65 || charCode > 90))
      return false;
  return true;
}






function isNumberKey(evt) {

  var charCode = (evt.which) ? evt.which : evt.keyCode
  if (charCode > 31 && (charCode < 48 || charCode > 57))
      return false;
  return true;
}








var dtToday = new Date();
var month = dtToday.getMonth() + 1;
var day = dtToday.getDate();
var year = dtToday.getFullYear();

if (month < 10)
  month = '0' + month.toString();
if (day < 10)
  day = '0' + day.toString();

var maxDate = year + '-' + month + '-' + day;


$('.dob').attr('max', maxDate);
if($('.dob').val() == '')
{
  $('.dob').val(maxDate);
}


























 
  
  
  
  
  

  


















$(document).ready(function() {
  $(".capitalizeText").on("input", function() {
      var text = $(this).val();
      var lastChar = text.charAt(text.length - 1);

      if (/[a-z]/.test(lastChar)) {
      $(this).val(text.slice(0, -1) + lastChar.toUpperCase());
      }
  });
});


$(document).ready(function() {
  $(".LowercaseText").on("input", function() {
      var text = $(this).val();
      var lastChar = text.charAt(text.length - 1);

      if (/[A-Z]/.test(lastChar)) {
      $(this).val(text.slice(0, -1) + lastChar.toLowerCase());
      }
  });
});


