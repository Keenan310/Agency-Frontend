(function () {
  const REQUIRED_FIELDS = ['bk-fname', 'bk-lname', 'bk-dob', 'bk-nationality', 'bk-gender', 'bk-email', 'bk-phone', 'bk-passport', 'bk-passport-expiry'];

  function getField(id) {
    return document.getElementById(id);
  }

  function validatePassengerForm() {
    let valid = true;
    REQUIRED_FIELDS.forEach((id) => {
      const el = getField(id);
      if (!el) return;
      const empty = !el.value.trim();
      el.classList.toggle('error', empty);
      const msg = el.parentElement.querySelector('.pd-error-msg');
      if (msg) msg.textContent = empty ? 'This field is required' : '';
      if (empty) valid = false;
    });
    return valid;
  }

  function clearValidation() {
    REQUIRED_FIELDS.forEach((id) => {
      const el = getField(id);
      if (!el) return;
      el.classList.remove('error');
    });
  }

  function getPassengerData() {
    return {
      firstName:       getField('bk-fname')?.value.trim() || '',
      lastName:        getField('bk-lname')?.value.trim() || '',
      dateOfBirth:     getField('bk-dob')?.value || '',
      nationality:     getField('bk-nationality')?.value.trim() || '',
      gender:          getField('bk-gender')?.value || '',
      email:           getField('bk-email')?.value.trim() || '',
      phone:           getField('bk-phone')?.value.trim() || '',
      passportNumber:  getField('bk-passport')?.value.trim() || '',
      passportExpiry:  getField('bk-passport-expiry')?.value || '',
      passportIssue:   getField('bk-passport-issue')?.value || '',
    };
  }

  function buildNdcPassengerPayload(offerId) {
    const pax = getPassengerData();
    return {
      OfferId: offerId,
      Passengers: [{
        PassengerTypeCode: 'ADT',
        FirstName:  pax.firstName,
        LastName:   pax.lastName,
        DateOfBirth: pax.dateOfBirth,
        Nationality: pax.nationality,
        Gender:      pax.gender,
        Email:       pax.email,
        Phone:       pax.phone,
        PassportNumber: pax.passportNumber,
        PassportExpiry: pax.passportExpiry,
        PassportIssue:  pax.passportIssue,
      }],
    };
  }

  window.passengerDetailsStep = {
    validate:    validatePassengerForm,
    clearErrors: clearValidation,
    getData:     getPassengerData,
    buildPayload: buildNdcPassengerPayload,
  };
})();
