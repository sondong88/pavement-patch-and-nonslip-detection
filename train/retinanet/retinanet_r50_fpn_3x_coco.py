_base_ = [
    'retinanet_r50_fpn.py',
    'coco_detection.py',
    'schedule_3x.py', 'default_runtime.py',
]

# optimizer
optim_wrapper = dict(
    optimizer=dict(type='SGD', lr=0.001, momentum=0.9, weight_decay=0.0001))
