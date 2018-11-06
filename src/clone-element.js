const cloneElement = (document, element) => {
	if (element.nodeValue) {
		return document.createTextNode(element.nodeValue);
	}

	const newElement = document.createElement(element.nodeName);
	newElement.style = {...element.style};
	newElement.static = element.static;
	newElement.unstable__transformChildren = element.unstable__transformChildren; // eslint-disable-line camelcase
	newElement.textContent = element.textContent;
	newElement.nodeValue = element.nodeValue;

	for (const childNode of element.childNodes) {
		newElement.appendChild(cloneElement(document, childNode));
	}

	return newElement;
};

export default cloneElement;
