_base_ = './faster-rcnn_s50_fpn_syncbn-backbone+head_ms-range-3x_coco.py'
model = dict(
    backbone=dict(
        stem_channels=128,
        depth=101,
        init_cfg=dict(type='Pretrained',
                      checkpoint='open-mmlab://resnest101')))
