/*
	Admin page functionalities file

	Author: Raul Rosá
	Created on: Tuesday, 23/04/2019

	Objetives:
		Contains the functionalities of the admin page. Most of them consists in making HTTP requests to the server regarding
		database information, and awaiting response

*/

/********************

	SCHEDULES

*******************/

const getSchedules = async function(){
	await axios.get('/schedules')
	.then(res => {
		if(!res.data.error){
			createScheduleTable(res.data.schedules);
			setEditScheduleTable(res.data.schedules);
		}
	});
}

const saveSchedules = async function(button){
	button.disabled = "true";
	let inputs = getSchedulesEditInputs();
	if(validateSchedulesEdit(inputs)){
		await axios.post('/updateSchedules', inputs)
		.then(res => {
			if(res.status != 200){
				console.error(res);
				alert("Houve um erro ao atualizar os horários.");
			}
			else{
				$('#editSchedules').modal('hide');
				refreshSchedules();
			}
		})
	}
	button.disabled = false;
}

const refreshSchedules = function(){
	let table = gId("schedule-table");
	while(table.firstChild)
		table.removeChild(table.firstChild);
	getSchedules();
}

const createScheduleTable = function(schedules){
	let startTime = 24, endTime = 1;
	let weekDays = [ [], [], [], [], [], [], [] ];

	schedules.forEach((schedule) => {
		if(schedule.start_time < startTime)
			startTime = schedule.start_time;
		if(schedule.end_time > endTime)
			endTime = schedule.end_time;

		switch(schedule.weekDay.toLowerCase()){
			case 'monday':
				for(let i = schedule.start_time; i < schedule.end_time; i++)
					weekDays[1].push({time: i, open: schedule.open, id: schedule.id_schedule});
				break;
			case 'tuesday':
				for(let i = schedule.start_time; i < schedule.end_time; i++)
					weekDays[2].push({time: i, open: schedule.open, id: schedule.id_schedule});
				break;
			case 'wednesday':
				for(let i = schedule.start_time; i < schedule.end_time; i++)
					weekDays[3].push({time: i, open: schedule.open, id: schedule.id_schedule});
				break;
			case 'thursday':
				for(let i = schedule.start_time; i < schedule.end_time; i++)
					weekDays[4].push({time: i, open: schedule.open, id: schedule.id_schedule});
				break;
			case 'friday':
				for(let i = schedule.start_time; i < schedule.end_time; i++)
					weekDays[5].push({time: i, open: schedule.open, id: schedule.id_schedule});
				break;
			case 'saturday':
				for(let i = schedule.start_time; i < schedule.end_time; i++)
					weekDays[6].push({time: i, open: schedule.open, id: schedule.id_schedule});
				break;
			case 'sunday':
				for(let i = schedule.start_time; i < schedule.end_time; i++)
					weekDays[0].push({time: i, open: schedule.open, id: schedule.id_schedule});
				break;
			default:
				break;
		}
	});

	let tableHeader = getScheduleHeader();
	let columnHeader = getHourIntervals(startTime, endTime);

	fillScheduleTable(synchronizeWeekdays(weekDays), tableHeader, columnHeader);
}

const fillScheduleTable = async function(content, header, columnHeader){
	let scheduleTable = gId("schedule-table");

	//Add the table header
	let tHead = document.createElement('thead');
		let tHeadRow = document.createElement('tr');
			for(let i = 0; i < header.length; i++)
				tHeadRow.appendChild(addTh(header[i].date, 'col'));
		tHead.appendChild(tHeadRow);
	scheduleTable.appendChild(tHead);

	await axios.post('/getReservations')
	.then((res) => {
		let reservations = res.data;

		let tBody = document.createElement('tbody');
			columnHeader.forEach((hd) => {
				let tBodyRow = document.createElement('tr');
					tBodyRow.appendChild(addTh(hd.interval, 'row'));

					for(let i = 0; i < content.length; i++){
						let obj = content[i].find((obj) => {return obj.time == hd.startTime});
						let todayReservations = reservations.filter((obj) => {return obj.start_time == hd.startTime && obj.weekDay == getWeekDay(header[i+1].day)});
						let reservationsToConfirm = todayReservations.filter((obj) => {return parseInt(obj.confirmed) == 0})
						let date = new Date();
						let tdClass = "";
						let tdId = "";
						let notifications = null;
						let clickFunction = null;

						if(date.getHours() >= hd.startTime && date.getDay() == header[i+1].day)
							tdClass = "bg-secondary"; //finished
						else if(obj === undefined)
							tdClass = "bg-danger"; //not exists
						else if(obj.open == 0)
							tdClass = "bg-danger"; //closed
						else if(reservationsToConfirm.length > 0){
							tdClass = "bg-warning can-reserve";
							notifications = reservationsToConfirm.length;
							tdId = "wd:"+getWeekDay(header[i+1].day)+"-st:"+hd.startTime+"-id:"+obj.id;
							clickFunction = showConfirmReservations;
						}
						else if(todayReservations.length > 0)
							tdClass = "bg-success";
						//Add the reserved color and notifications.
						tBodyRow.appendChild(addScheduleTd(tdClass, tdId, notifications, clickFunction));
					}
				tBody.appendChild(tBodyRow);
			});
		scheduleTable.appendChild(tBody);
	})
}

const setEditScheduleTable = function(schedules){
	schedules.forEach((sh) => {
		let idName = '';
		if(sh.start_time < 13)
			idName = sh.weekDay + '-morning';
		else if(sh.start_time < 19)
			idName = sh.weekDay + '-noon';
		else if(sh.start_time < 23)
			idName = sh.weekDay + '-night';
		else
			return;

		gId(idName + '-open').checked = (sh.open == 1) ? true : false;
		gId(idName + '-startTime').value = sh.start_time;
		gId(idName + '-endTime').value = sh.end_time;
	});
}

const showConfirmReservations = async function(e){
	let info = e.target.id;
	let modalBody = gId("confirmReservationsBody");
	clearConfirmReservations();
	$('#confirmReservations').modal('show');

	let subinfo = info.split('-');
	let weekDay = subinfo[0].split(':')[1];
	let startTime = parseInt(subinfo[1].split(':')[1]);
	let id_schedule = parseInt(subinfo[2].split(':')[1]);
	await axios.post('/getScheduleReservations', {weekDay, startTime, id_schedule})
	.then((res) => {
		let reservations = res.data;
		reservations.forEach(async (reservation) => {
			let formGroup = document.createElement('div');
				formGroup.className += "form-group";
				formGroup.id = "formGroup-"+reservation.id_reservation;
				let userGroup = document.createElement('div');
					userGroup.className += "input-group";
					let userGroupPrepend = document.createElement('div');
						userGroupPrepend.className += "input-group-prepend";
						let userGroupPrependLabel = document.createElement('label');
							userGroupPrependLabel.className += "input-group-text";
							userGroupPrependLabel.appendChild(document.createTextNode("Usuário: "));
						userGroupPrepend.appendChild(userGroupPrependLabel)
					userGroup.appendChild(userGroupPrepend);

					let userGroupInput = document.createElement('input');
						userGroupInput.type = "text";
						userGroupInput.className += "form-control cursor-context";
						userGroupInput.value = reservation.name;
						userGroupInput.readOnly = true;
					userGroup.appendChild(userGroupInput);
				formGroup.appendChild(userGroup);

				let equipments = await getReservedEquipments(reservation.id_reservation);
				equipments.data.forEach((equip) => {
					let inputGroup = document.createElement('div');
						inputGroup.className += "input-group";
						let equipInput = document.createElement('input');
							equipInput.type = "text";
							equipInput.className += "form-control bg-success text-white cursor-context";
							equipInput.readOnly = true;
							equipInput.value = `${equip.qtd}x ${equip.name}`;
						inputGroup.appendChild(equipInput);
					formGroup.appendChild(inputGroup);
				})

				let btnGroup = document.createElement('div');
					btnGroup.className += 'input-group';
					btnGroup.id = 'reservation-'+reservation.id_reservation;
					let acceptBtn = document.createElement('button');
						acceptBtn.className = "form-control btn btn-primary";
						acceptBtn.appendChild(document.createTextNode('Aceitar'));
						acceptBtn.addEventListener('click', (e) => acceptReservation(e));
					btnGroup.appendChild(acceptBtn);

					let declineBtn = document.createElement('button');
						declineBtn.className = "form-control btn btn-danger";
						declineBtn.appendChild(document.createTextNode('Recusar'));
						declineBtn.addEventListener('click', (e) => declineReservation(e));
					btnGroup.appendChild(declineBtn);

				formGroup.appendChild(btnGroup);
			modalBody.appendChild(formGroup);
		});
	})
}

const getReservedEquipments = async function(id_reservation){
	return axios.post('/equipmentsForReservation', {id: id_reservation})
}

const acceptReservation = async function(event){
	let id_reservation = event.target.parentElement.id.split('-')[1];
	await axios.post('/acceptReservation', {id_reservation})
	.then((res) => {
		postReservation(id_reservation)
	})
}

const declineReservation = async function(event){
	let id_reservation = event.target.parentElement.id.split('-')[1];
	await axios.post('/declineReservation', {id_reservation})
	.then((res) => {
		postReservation(id_reservation)
	})
}

const postReservation = function(id_reservation){
	let group = gId("formGroup-"+id_reservation);
	group.parentElement.removeChild(group);
	refreshSchedules();
}

/********************

	EQUIPMENTS

********************/

const getEquipments = async function(){
	await axios.get('/equipments')
	.then(res => {
		if(!res.data.error)
			createEquipmentTable(res.data.equipments);
	});
}

const saveNewEquipment = async function(button){
	button.disabled = "true";
	let newName = gId("newEquipmentName");
	let newDesc = gId("newEquipmentDescription");
	let newQtd = gId("newEquipmentQtd");
	let input = {name: newName.value, description: newDesc.value, qtd: newQtd.value};
	if(gId("addEquipmentsForm").checkValidity()){
		await axios.post('/addEquipment', input)
		.then(res => {
			if(res.status != 200){
				console.error(res);
				alert("Houve um erro ao inserir o equipments.");
			}
			else{
				$('#addEquipment').modal('hide');
				refreshEquipments();
			}
		});
	}
	else{
		newName.setCustomValidity("invalid");
		newDesc.setCustomValidity("invalid");
		newQtd.setCustomValidity("invalid");
	}
	button.disabled = false;
	clearNewEquipmentForm();
	refreshSchedules();
}

const saveEditEquipment = async function(button){
	button.disabled = "true";
	let newId = gId("editEquipmentId");
	let newName = gId("editEquipmentName");
	let newDesc = gId("editEquipmentDescription");
	let newQtd = gId("editEquipmentQtd");
	let input = {id: newId.value, name: newName.value, description: newDesc.value, qtd: newQtd.value};
	if(gId("editEquipmentsForm").checkValidity()){
		await axios.post('/editEquipment', input)
		.then(res => {
			if(res.status != 200){
				console.error(res);
				alert("Houve um erro ao alterar o equipmento.");
			}
			else{
				$('#editEquipment').modal('hide');
				refreshEquipments();
			}
		});
	}
	else{
		newName.setCustomValidity("invalid");
		newDesc.setCustomValidity("invalid");
		newQtd.setCustomValidity("invalid");
	}
	button.disabled = false;
	refreshSchedules();
}

const refreshEquipments = function(){
	let table = gId("equipments-table");
	while(table.firstChild)
		table.removeChild(table.firstChild);
	getEquipments();
}

const createEquipmentTable = function(equipments){
	let table = gId('equipments-table');

	equipments.forEach((equip) => {
		let tRow = document.createElement('tr');
			tRow.appendChild(addTd(equip.id_equipment));
			tRow.appendChild(addTd(equip.name));
			tRow.appendChild(addTd(equip.description));
			tRow.appendChild(addTd(equip.qtd));
			tRow.appendChild(addOpTd(null, tRow));
		table.appendChild(tRow);
	});
}

/*******************

	USERS

*******************/

const getUsers = async function(){
	await axios.get('/users')
	.then(res => {
		if(!res.data.error)
			createUserTable(res.data.users);
	});
}

const createUserTable = function(users){
	let table = gId('users-table');

	users.forEach((user) => {
		let tRow = document.createElement('tr');
		tRow.appendChild(addTd(user.id_user));
		tRow.appendChild(addTd(user.name));
		tRow.appendChild(addTd(user.email));
		tRow.appendChild(addTd(user.cpf));
		tRow.appendChild((parseInt(user.permission) == 1) ? addTd('Admin') : addPermTd(null, tRow));
		table.appendChild(tRow);
	});
}

/*******************

	UTILITIES

*******************/

const synchronizeWeekdays = function(weekDays){
	let date = new Date();
	for(let i = 0; i < date.getDay(); i++){
		let day = weekDays.shift();
		weekDays.push(day);
	}

	return weekDays;
}

const getDateInStandard = function(date, dayOffset){
	let newDay = new Date();
	newDay.setDate(date.getDate() + (dayOffset ? dayOffset : 0));
	let dd = String(newDay.getDate()).padStart(2, '0');
	let mm = String(newDay.getMonth()+1).padStart(2, '0');

	return {date: dd + '/' + mm, day: newDay.getDay() };
}

const getSchedulesEditInputs = function(){
	let arr = [];
	for(let i = 0; i < 7; i++){
		let weekDay;
		switch(i){
			case 0:
				weekDay = 'sunday';
				break;
			case 1:
				weekDay = 'monday';
				break;
			case 2:
				weekDay = 'tuesday';
				break;
			case 3:
				weekDay = 'wednesday';
				break;
			case 4:
				weekDay = 'thursday';
				break;
			case 5:
				weekDay = 'friday';
				break;
			case 6:
				weekDay = 'saturday';
				break;
			default:
				return null;
		}
		arr.push({weekDay: weekDay});
		arr[i].morning = {check: gId(weekDay+'-morning-open').checked, startTime: gId(weekDay+'-morning-startTime').value, endTime: gId(weekDay+'-morning-endTime').value};
		arr[i].noon = {check: gId(weekDay+'-noon-open').checked, startTime: gId(weekDay+'-noon-startTime').value, endTime: gId(weekDay+'-noon-endTime').value};
		arr[i].night = {check: gId(weekDay+'-night-open').checked, startTime: gId(weekDay+'-night-startTime').value, endTime: gId(weekDay+'-night-endTime').value};
	}
	return arr;
}

const getScheduleHeader = function(){
	let today = new Date();
	let tableHeader = [{date: 'Horários', day: null }, {date: 'Hoje', day: today.getDay() }];
	for(let i = 1; i < 7; i++)
		tableHeader.push(getDateInStandard(today, i));
	return tableHeader;
}

const getHourIntervals = function(startTime, endTime){
	let intervals = [];
	for(let i = startTime; i < endTime; i++){
		intervals.push({interval:  `${i}:00 - ${i+1}:00`, startTime: i});
	}
	return intervals;
}

const clearNewEquipmentForm = function(){
	gId("newEquipmentName").value = "";
	gId("newEquipmentDescription").value = "";
	gId("newEquipmentQtd").value = 0;
}

const clearConfirmReservations = function(){
	let body = gId("confirmReservationsBody");
	while(body.firstChild)
		body.removeChild(body.firstChild)
}

const addTh = function(text, scope){
	let th = document.createElement('th');
	th.scope = scope;
	th.appendChild(document.createTextNode(text));
	return th;
}

const addTd = function(data, tdClass){
	let td = document.createElement('td');
	td.className += tdClass;
	td.appendChild(document.createTextNode(data));

	return td;
}

const addOpTd = function(tdClass, row){
	let td = document.createElement('td');
	td.className += tdClass;
		let updateLink = document.createElement('a');
		updateLink.href = "#"
		updateLink.innerHTML = 'Editar';
		updateLink.className += "text-warning mr-2";
		updateLink.addEventListener('click', () => {
			toggleEditEquipmentModal(row);
		});
	td.appendChild(updateLink);

		let deleteLink = document.createElement('a');
		deleteLink.href = "#"
		deleteLink.innerHTML = '&times;';
		deleteLink.className += "text-danger";
		deleteLink.addEventListener('click', () => {
			deleteRow(row);
		});
	td.appendChild(deleteLink);

	return td;
}

const addPermTd = function(tdClass, row){
	let td = document.createElement('td');
	td.className += tdClass;
		let alterPermLink = document.createElement('a');
		alterPermLink.href = "#"
		alterPermLink.innerHTML = 'Transformar em Admin';
		alterPermLink.addEventListener('click', () => {
			giveAdmin(row);
		});
	td.appendChild(alterPermLink);

	return td;
}

const addScheduleTd = function(tdClass, tdId, badge, clickFunction){
	let td = document.createElement('td');
	td.className += tdClass;
	td.id = tdId;
	if(badge){
		let span = document.createElement('span');
		span.className += "badge badge-light";
		span.appendChild(document.createTextNode(badge));
		td.appendChild(span);
	}
	if(typeof clickFunction === 'function'){
		td.addEventListener('click', (e) => {
			clickFunction(e);
		});
	}

	return td;
}

/***********************

	VALIDATION

**********************/

const validateSchedulesEdit = function(inputs){
	let valid = true;
	inputs.forEach((day) => {
		if(parseInt(day.morning.startTime) >= parseInt(day.morning.endTime)){
			gId(`${day.weekDay}-morning-startTime`).setCustomValidity('invalid');
			gId(`${day.weekDay}-morning-endTime`).setCustomValidity('invalid');
			valid = false;
		}
		else
			gId(`${day.weekDay}-morning-startTime`).setCustomValidity('');

		if(parseInt(day.noon.startTime) >= parseInt(day.noon.endTime)){
			gId(`${day.weekDay}-noon-startTime`).setCustomValidity('invalid');
			gId(`${day.weekDay}-noon-endTime`).setCustomValidity('invalid');
			valid = false;
		}
		else
			gId(`${day.weekDay}-noon-startTime`).setCustomValidity('');

		if(parseInt(day.night.startTime) >= parseInt(day.night.endTime)){
			gId(`${day.weekDay}-night-startTime`).setCustomValidity('invalid');
			gId(`${day.weekDay}-night-endTime`).setCustomValidity('invalid');
			valid = false;
		}
		else
			gId(`${day.weekDay}-night-startTime`).setCustomValidity('');
	});

	if(!gId("editSchedulesForm").checkValidity())
		valid = false;

	return valid;
}

/*****************

	CLICK HANDLERS

*****************/
const deleteRow = async function(row){
	let res = confirm("Deseja mesmo excluir este dado?");
	if(res){
		let id = parseInt(row.firstChild.textContent);
		await axios.post('/deleteEquipment', {id: id})
		.then((res) => {
			if(res.status != 200){
				console.error(res);
				alert("Houve um erro ao inserir o equipments.");
			}
			else{
				row.parentElement.removeChild(row);
				refreshSchedules();
			}
		})
	}
}

const toggleEditEquipmentModal = async function(row){
	$('#editEquipment').modal('show');
	let values = [];
	row.childNodes.forEach((child) => {
		values.push(child.textContent);
	});
	gId("editEquipmentId").value = values[0];
	gId("editEquipmentName").value = values[1];
	gId("editEquipmentDescription").value = values[2];
	gId("editEquipmentQtd").value = values[3];
}

const giveAdmin = async function(row){
	let res = confirm("Deseja dar a este usuário permissões de administrador?");
	if(res){
		let id = parseInt(row.firstChild.textContent);
		await axios.post('/giveAdmin', {id: id})
		.then((res) => {
			if(res.status != 200){
				console.error(res);
				alert("Houve um erro ao alterar as permissões.");
			}
			else{
				row.removeChild(row.childNodes[4]);
				row.appendChild(addTd('Admin'));
			}
		})
	}
}

/******************

	EVENTS

*******************/

window.addEventListener('load', ()=> {
	getSchedules();
	getEquipments();
	getUsers();
});


gId("saveSchedules").addEventListener('click',(e) => {
	saveSchedules(e.target);
});

gId("saveNewEquipment").addEventListener('click',(e) => {
	saveNewEquipment(e.target);
})

gId("saveEditEquipment").addEventListener('click',(e) => {
	saveEditEquipment(e.target);
})

