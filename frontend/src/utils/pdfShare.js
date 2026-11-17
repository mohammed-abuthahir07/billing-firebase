export async function shareOrDownloadFile(file, title) {
  if (!(file instanceof File)) {
    throw new Error('A PDF file is required.');
  }

  const canShareFiles = typeof navigator !== 'undefined'
    && typeof navigator.share === 'function'
    && typeof navigator.canShare === 'function'
    && navigator.canShare({ files: [file] });

  if (canShareFiles) {
    await navigator.share({
      files: [file],
      title: title || file.name,
      text: title || file.name,
    });
    return 'shared';
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
